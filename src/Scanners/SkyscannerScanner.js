import { Config } from '../../config/config.js';

export const AIRPORT_MAP = {
  BCN: { skyId: 'BCN', entityId: '95565085', name: 'Barcelona', country: 'España' },
  PMI: { skyId: 'PMI', entityId: '95565111', name: 'Palma de Mallorca', country: 'España' },
  IBZ: { skyId: 'IBZ', entityId: '95565093', name: 'Ibiza', country: 'España' },
  MAH: { skyId: 'MAH', entityId: '104120218', name: 'Menorca', country: 'España' },
  SVQ: { skyId: 'SVQ', entityId: '95565089', name: 'Sevilla', country: 'España' },
  OPO: { skyId: 'OPO', entityId: '95566290', name: 'Oporto', country: 'Portugal' },
  LIS: { skyId: 'LIS', entityId: '95565055', name: 'Lisboa', country: 'Portugal' },
  BGY: { skyId: 'MILA', entityId: '27544068', name: 'Milán Bergamo', country: 'Italia' },
  MXP: { skyId: 'MILA', entityId: '27544068', name: 'Milán Malpensa', country: 'Italia' },
  BLQ: { skyId: 'BLQ', entityId: '95673834', name: 'Bolonia', country: 'Italia' },
  BOD: { skyId: 'BOD', entityId: '95673976', name: 'Burdeos', country: 'Francia' },
  NCE: { skyId: 'NCE', entityId: '95673860', name: 'Niza', country: 'Francia' },
  GVA: { skyId: 'GVA', entityId: '95674055', name: 'Ginebra', country: 'Suiza' },
};

export class SkyscannerScanner {
  constructor(settings = Config.settings) {
    this.settings = settings;
    this.apiKey = Config.rapidapi.apiKey;
    this.host = 'sky-scrapper.p.rapidapi.com';
    this.origin = AIRPORT_MAP.BCN;
    this.priorityDestinations = (settings.priorityDestinations || []).filter(
      (code) => AIRPORT_MAP[code]
    );
  }

  async fetchApi(endpoint, params = {}) {
    if (!this.apiKey) {
      console.warn('[Skyscanner] Falta RAPIDAPI_KEY en .env');
      return null;
    }

    const query = new URLSearchParams(params).toString();
    const url = `https://${this.host}/api/v1/flights/${endpoint}?${query}`;

    try {
      const res = await fetch(url, {
        headers: {
          'x-rapidapi-host': this.host,
          'x-rapidapi-key': this.apiKey,
        },
      });

      if (!res.ok) {
        console.warn(`[Skyscanner] HTTP ${res.status} en ${endpoint}`);
        return null;
      }

      return await res.json();
    } catch (err) {
      console.error(`[Skyscanner] Error en ${endpoint}:`, err.message);
      return null;
    }
  }

  async getPriceCalendar(dstIata, fromDate) {
    const dst = AIRPORT_MAP[dstIata];
    if (!dst) return [];

    const res = await this.fetchApi('getPriceCalendar', {
      originSkyId: this.origin.skyId,
      destinationSkyId: dst.skyId,
      fromDate,
      currency: 'EUR',
    });

    return res?.data?.flights?.days || [];
  }

  async searchFlights(dstIata, date, returnDate) {
    const dst = AIRPORT_MAP[dstIata];
    if (!dst) return [];

    const res = await this.fetchApi('searchFlights', {
      originSkyId: this.origin.skyId,
      destinationSkyId: dst.skyId,
      originEntityId: this.origin.entityId,
      destinationEntityId: dst.entityId,
      date,
      returnDate,
      currency: 'EUR',
      cabinClass: 'economy',
      adults: 1,
    });

    const itineraries = res?.data?.itineraries || [];
    const fares = [];

    for (const it of itineraries) {
      const legOut = it.legs?.[0];
      const legIn = it.legs?.[1];

      if (!legOut || !legIn) continue;
      // Solo vuelos directos
      if (legOut.stopCount > 0 || legIn.stopCount > 0) continue;

      const totalPrice = it.price?.raw || 0;
      if (totalPrice <= 0 || totalPrice > 55) continue;

      const carrierOut = legOut.carriers?.marketing?.[0]?.name || 'Aerolínea';
      const carrierIn = legIn.carriers?.marketing?.[0]?.name || 'Aerolínea';
      const carrierCombined =
        carrierOut === carrierIn ? carrierOut : `${carrierOut} / ${carrierIn}`;

      const outDep = new Date(legOut.departure);
      const inDep = new Date(legIn.departure);
      const diffDays = Math.round((inDep - outDep) / (1000 * 3600 * 24));

      const fare = {
        airline: carrierCombined,
        outbound: {
          departureAirport: {
            iataCode: 'BCN',
            name: 'Barcelona-El Prat',
            city: { name: 'Barcelona' },
            countryName: 'España',
          },
          arrivalAirport: {
            iataCode: dstIata,
            name: dst.name,
            city: { name: dst.name },
            countryName: dst.country,
          },
          departureDate: legOut.departure,
          arrivalDate: legOut.arrival,
          flightNumber: legOut.segments?.[0]?.flightNumber || carrierOut,
          price: { value: totalPrice / 2 },
        },
        inbound: {
          departureAirport: {
            iataCode: dstIata,
            name: dst.name,
            city: { name: dst.name },
            countryName: dst.country,
          },
          arrivalAirport: {
            iataCode: 'BCN',
            name: 'Barcelona-El Prat',
            city: { name: 'Barcelona' },
            countryName: 'España',
          },
          departureDate: legIn.departure,
          arrivalDate: legIn.arrival,
          flightNumber: legIn.segments?.[0]?.flightNumber || carrierIn,
          price: { value: totalPrice / 2 },
        },
        summary: {
          price: { value: totalPrice },
          tripDurationDays: diffDays,
        },
        bookingUrl: `https://www.skyscanner.es/transport/flights/bcn/${dstIata.toLowerCase()}/${date.slice(2).replace(/-/g, '')}/${returnDate.slice(2).replace(/-/g, '')}/?adultsv2=1&cabinclass=economy`,
      };

      fares.push(fare);
    }

    return fares;
  }

  async scan() {
    if (!this.apiKey) {
      console.log('[Skyscanner] Sin API key configurada, se omite este scanner.');
      return [];
    }

    console.log(`[Skyscanner] 🌐 Iniciando rastreo multi-aerolínea (Vueling, EasyJet, Wizz, etc.)...`);

    const allFares = [];
    const today = new Date();
    const fromDate = today.toISOString().split('T')[0];

    // Rastreamos los 6 destinos top más baratos desde BCN (Palma, Ibiza, Menorca, Oporto, Bolonia, Milán)
    const targets = ['PMI', 'IBZ', 'OPO', 'BLQ', 'BGY', 'SVQ'];

    for (const dst of targets) {
      try {
        console.log(`  [Skyscanner] Analizando calendario de precios para ${dst}...`);
        const days = await this.getPriceCalendar(dst, fromDate);

        // Buscar días con precios de ida muy bajos (<= 25 €)
        const cheapDays = days
          .filter((d) => d.price && d.price <= 28)
          .slice(0, 3); // Evaluamos hasta 3 mejores días para cuidar la cuota

        for (const cd of cheapDays) {
          // 1. Probar Day-Trip en esa fecha barata (ida y vuelta el mismo día)
          const dtFares = await this.searchFlights(dst, cd.day, cd.day);
          allFares.push(...dtFares);

          // Pausa de cortesía
          await new Promise((r) => setTimeout(r, 400));
        }
      } catch (err) {
        console.error(`  [Skyscanner] Error escaneando ${dst}:`, err.message);
      }
    }

    console.log(`[Skyscanner] 📦 Total tarifas multi-aerolínea encontradas: ${allFares.length}`);
    return allFares;
  }
}
