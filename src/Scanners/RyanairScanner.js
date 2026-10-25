import { Config } from '../../config/config.js';

export class RyanairScanner {
  constructor(settings = Config.settings) {
    this.settings = settings;
    this.origin = settings.originAirport || 'BCN';
    this.priorityDestinations = settings.priorityDestinations || [];
    this.baseUrl = 'https://www.ryanair.com/api/farfnd/v4/roundTripFares';
  }

  getDateRange(daysAhead = 75) {
    const today = new Date();
    // Empezamos desde mañana
    const start = new Date(today);
    start.setDate(today.getDate() + 1);

    const end = new Date(today);
    end.setDate(today.getDate() + daysAhead);

    const formatDate = (d) => d.toISOString().split('T')[0];

    return {
      fromDate: formatDate(start),
      toDate: formatDate(end),
    };
  }

  async fetchFares(params) {
    const query = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}?${query}`;

    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
          'Accept': 'application/json',
        },
      });

      if (!res.ok) {
        return [];
      }

      const data = await res.json();
      return Array.isArray(data.fares) ? data.fares : [];
    } catch (err) {
      console.error(`[RyanairScanner] Error en consulta (${query}):`, err.message);
      return [];
    }
  }

  async scan() {
    const { fromDate, toDate } = this.getDateRange(this.settings.searchDaysAhead || 180);
    const maxGlobalPrice = 65;

    const baseParams = {
      departureAirportIataCode: this.origin,
      outboundDepartureDateFrom: fromDate,
      outboundDepartureDateTo: toDate,
      inboundDepartureDateFrom: fromDate,
      inboundDepartureDateTo: toDate,
      market: 'es',
    };

    console.log(`[RyanairScanner] 🔍 Rastreo iniciado desde ${this.origin} (${fromDate} al ${toDate}) con tope de ${maxGlobalPrice}€...`);

    const tasks = [];

    // 1. Barrido global de la red completa para Day-Trips (0 noches)
    tasks.push(
      this.fetchFares({
        ...baseParams,
        durationFrom: 0,
        durationTo: 0,
        priceValueTo: 50,
      })
    );

    // 2. Barrido global de la red completa para 1 a 2 noches (Findes y Escapadas)
    tasks.push(
      this.fetchFares({
        ...baseParams,
        durationFrom: 1,
        durationTo: 2,
        priceValueTo: maxGlobalPrice,
      })
    );

    // 3. Barrido focalizado para cada destino prioritario en Day-Trips y en Findes
    for (const dst of this.priorityDestinations) {
      // Day-trips en destino prioritario
      tasks.push(
        this.fetchFares({
          ...baseParams,
          arrivalAirportIataCode: dst,
          durationFrom: 0,
          durationTo: 0,
          priceValueTo: 50,
        })
      );

      // Findes/escapadas en destino prioritario
      tasks.push(
        this.fetchFares({
          ...baseParams,
          arrivalAirportIataCode: dst,
          durationFrom: 1,
          durationTo: 2,
          priceValueTo: maxGlobalPrice,
        })
      );
    }

    const results = await Promise.all(tasks);
    const allFares = results.flat();

    // Desduplicar tarifas por vuelo de ida + vuelta
    const uniqueMap = new Map();
    for (const fare of allFares) {
      if (!fare?.outbound?.flightKey || !fare?.inbound?.flightKey) continue;
      const key = `${fare.outbound.flightKey}__${fare.inbound.flightKey}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, fare);
      }
    }

    const uniqueFares = Array.from(uniqueMap.values());
    console.log(`[RyanairScanner] 📦 Total tarifas únicas recuperadas: ${uniqueFares.length}`);
    return uniqueFares;
  }
}
