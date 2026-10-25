import { Config } from '../../config/config.js';

export class FlightFilter {
  constructor(settings = Config.settings) {
    this.settings = settings;
    this.thresholds = settings.thresholds || {};
    this.blacklistedAirports = new Set(settings.blacklistedAirports || []);
    this.priorityDestinations = new Set(settings.priorityDestinations || []);
  }

  isBlacklisted(iata) {
    return this.blacklistedAirports.has(iata.toUpperCase());
  }

  isPriority(iata) {
    return this.priorityDestinations.has(iata.toUpperCase());
  }

  parseTime(dateStr) {
    // Retorna minutos desde medianoche (ej. 08:30 -> 510)
    const d = new Date(dateStr);
    return d.getHours() * 60 + d.getMinutes();
  }

  timeStringToMinutes(timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  }

  evaluateFare(rawFare) {
    const out = rawFare.outbound;
    const inb = rawFare.inbound;
    const summary = rawFare.summary;

    if (!out || !inb || !summary) return null;

    const destIata = out.arrivalAirport.iataCode;
    if (this.isBlacklisted(destIata)) {
      return null;
    }

    const totalPrice = summary.price.value;
    const outDepDate = new Date(out.departureDate);
    const outArrDate = new Date(out.arrivalDate);
    const inDepDate = new Date(inb.departureDate);
    const inArrDate = new Date(inb.arrivalDate);

    // Calcular horas netas en destino
    const diffMs = inDepDate.getTime() - outArrDate.getTime();
    const usefulHours = diffMs / (1000 * 3600);

    if (usefulHours <= 0) return null;

    const durationDays = summary.tripDurationDays;
    let mode = null;

    const outDepMinutes = this.parseTime(out.departureDate);
    const inDepMinutes = this.parseTime(inb.departureDate);

    // Modalidad 1: Day-Trip (mismo día • 0 noches)
    if (durationDays === 0) {
      const cfg = this.thresholds.daytrip;
      if (totalPrice > cfg.maxPrice) return null;
      if (usefulHours < cfg.minUsefulHours) return null;

      // Verificar franja horaria útil
      if (cfg.outboundMaxDepartureTime) {
        const maxOut = this.timeStringToMinutes(cfg.outboundMaxDepartureTime);
        if (outDepMinutes > maxOut) return null;
      }
      if (cfg.inboundMinDepartureTime) {
        const minIn = this.timeStringToMinutes(cfg.inboundMinDepartureTime);
        if (inDepMinutes < minIn) return null;
      }
      mode = 'daytrip';
    }
    // Modalidad 2: Finde Relámpago (1 noche)
    else if (durationDays === 1) {
      const cfg = this.thresholds.weekend;
      if (totalPrice > cfg.maxPrice) return null;
      if (usefulHours < cfg.minUsefulHours) return null;
      mode = 'weekend';
    }
    // Modalidad 3: Escapada Clásica (2 noches)
    else if (durationDays === 2) {
      const cfg = this.thresholds.bridge;
      if (totalPrice > cfg.maxPrice) return null;
      if (usefulHours < cfg.minUsefulHours) return null;
      mode = 'bridge';
    } else {
      // Viajes de más de 2 noches quedan fuera del perfil relámpago de Martín
      return null;
    }

    const dateOutStr = out.departureDate.split('T')[0];
    const dateInStr = inb.departureDate.split('T')[0];

    const bookingUrl =
      rawFare.bookingUrl ||
      `https://www.ryanair.com/es/es/trip/flights/select?originIata=BCN&destinationIata=${destIata}&isReturn=true&dateOut=${dateOutStr}&dateIn=${dateInStr}&adults=1`;

    const ratio = usefulHours / totalPrice;
    const airline = rawFare.airline || 'Ryanair';

    return {
      mode,
      airline,
      destinationIata: destIata,
      destinationCity: out.arrivalAirport.city?.name || destIata,
      destinationCountry: out.arrivalAirport.countryName || '',
      originIata: 'BCN',
      totalPrice,
      usefulHours,
      ratio,
      isPriority: this.isPriority(destIata),
      bookingUrl,
      outbound: {
        flightNumber: out.flightNumber,
        departureDate: out.departureDate,
        arrivalDate: out.arrivalDate,
        price: out.price.value,
      },
      inbound: {
        flightNumber: inb.flightNumber,
        departureDate: inb.departureDate,
        arrivalDate: inb.arrivalDate,
        price: inb.price.value,
      },
    };
  }

  filterFares(faresList) {
    const dealsMap = new Map();

    for (const fare of faresList) {
      const evaluated = this.evaluateFare(fare);
      if (!evaluated) continue;

      // Clave canónica única para evitar duplicados entre diferentes APIs (Ryanair vs Google Flights)
      const outDate = evaluated.outbound.departureDate.substring(0, 10);
      const inDate = evaluated.inbound.departureDate.substring(0, 10);
      const key = `${evaluated.destinationIata}_${outDate}_${inDate}_${evaluated.airline}`;

      if (dealsMap.has(key)) {
        const existing = dealsMap.get(key);
        // Si ya existe la misma combinación, conservar la de menor precio o mejor ratio
        if (evaluated.totalPrice < existing.totalPrice || (evaluated.totalPrice === existing.totalPrice && evaluated.usefulHours > existing.usefulHours)) {
          dealsMap.set(key, evaluated);
        }
      } else {
        dealsMap.set(key, evaluated);
      }
    }

    const deals = Array.from(dealsMap.values());

    // Ordenar: primero los de destinos prioritarios, luego por ratio de aprovechamiento (horas/euro) descendente
    return deals.sort((a, b) => {
      if (a.isPriority && !b.isPriority) return -1;
      if (!a.isPriority && b.isPriority) return 1;
      return b.ratio - a.ratio;
    });
  }
}
