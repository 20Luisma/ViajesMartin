import { Config } from '../../config/config.js';

const AIRPORT_METADATA = {
  PMI: { city: 'Palma de Mallorca', country: 'España' },
  IBZ: { city: 'Ibiza', country: 'España' },
  MAH: { city: 'Menorca', country: 'España' },
  SVQ: { city: 'Sevilla', country: 'España' },
  SCQ: { city: 'Santiago de Compostela', country: 'España' },
  AGP: { city: 'Málaga', country: 'España' },
  ALC: { city: 'Alicante', country: 'España' },
  VLC: { city: 'Valencia', country: 'España' },
  BIO: { city: 'Bilbao', country: 'España' },
  OVD: { city: 'Asturias', country: 'España' },
  OPO: { city: 'Oporto', country: 'Portugal' },
  LIS: { city: 'Lisboa', country: 'Portugal' },
  FAO: { city: 'Faro', country: 'Portugal' },
  BGY: { city: 'Milán Bérgamo', country: 'Italia' },
  MXP: { city: 'Milán Malpensa', country: 'Italia' },
  FCO: { city: 'Roma Fiumicino', country: 'Italia' },
  CIA: { city: 'Roma Ciampino', country: 'Italia' },
  NAP: { city: 'Nápoles', country: 'Italia' },
  BLQ: { city: 'Bolonia', country: 'Italia' },
  PSA: { city: 'Pisa', country: 'Italia' },
  VCE: { city: 'Venecia', country: 'Italia' },
  TRS: { city: 'Trieste', country: 'Italia' },
  BRI: { city: 'Bari', country: 'Italia' },
  PMO: { city: 'Palermo', country: 'Italia' },
  CTA: { city: 'Catania', country: 'Italia' },
  TRN: { city: 'Turín', country: 'Italia' },
  BOD: { city: 'Burdeos', country: 'Francia' },
  NCE: { city: 'Niza', country: 'Francia' },
  MRS: { city: 'Marsella', country: 'Francia' },
  TLS: { city: 'Toulouse', country: 'Francia' },
  LYS: { city: 'Lyon', country: 'Francia' },
  NTE: { city: 'Nantes', country: 'Francia' },
  BRS: { city: 'Bristol', country: 'Reino Unido' },
  MAN: { city: 'Mánchester', country: 'Reino Unido' },
  BHX: { city: 'Birmingham', country: 'Reino Unido' },
  LPL: { city: 'Liverpool', country: 'Reino Unido' },
  EDI: { city: 'Edimburgo', country: 'Reino Unido' },
  DUB: { city: 'Dublín', country: 'Irlanda' },
  CRL: { city: 'Bruselas Charleroi', country: 'Bélgica' },
  BRU: { city: 'Bruselas', country: 'Bélgica' },
  EIN: { city: 'Eindhoven', country: 'Países Bajos' },
  BER: { city: 'Berlín', country: 'Alemania' },
  VIE: { city: 'Viena', country: 'Austria' },
  BUD: { city: 'Budapest', country: 'Hungría' },
  PRG: { city: 'Praga', country: 'República Checa' },
  SOF: { city: 'Sofía', country: 'Bulgaria' },
  GVA: { city: 'Ginebra', country: 'Suiza' },
  BSL: { city: 'Basilea', country: 'Suiza' },
  RAK: { city: 'Marrakech', country: 'Marruecos' },
  FEZ: { city: 'Fez', country: 'Marruecos' },
  TNG: { city: 'Tánger', country: 'Marruecos' },
  NDR: { city: 'Nador', country: 'Marruecos' },
  RBA: { city: 'Rabat', country: 'Marruecos' },
  OUJ: { city: 'Oujda', country: 'Marruecos' },
};

export class GoogleFlightsScanner {
  constructor(settings = Config.settings) {
    this.settings = settings;
    const rawKey = Config.rapidapi.apiKey || '';
    this.apiKeys = rawKey.split(',').map((k) => k.trim()).filter(Boolean);
    this.currentKeyIndex = 0;
    this.host = 'google-flights4.p.rapidapi.com';
    this.origin = settings.originAirport || 'BCN';
    this.priorityDestinations = settings.priorityDestinations || ['PMI', 'IBZ', 'OPO', 'SVQ', 'MAH', 'LIS', 'BGY'];
  }

  get activeKey() {
    return this.apiKeys[this.currentKeyIndex] || null;
  }

  async fetchEndpoint(endpoint, params = {}) {
    if (!this.activeKey) {
      console.warn('[GoogleFlights] Falta RAPIDAPI_KEY en .env');
      return null;
    }

    const query = new URLSearchParams(params).toString();
    const url = `https://${this.host}/flights/${endpoint}?${query}`;

    try {
      const res = await fetch(url, {
        headers: {
          'x-rapidapi-host': this.host,
          'x-rapidapi-key': this.activeKey,
        },
      });

      if (!res.ok) {
        if (res.status === 429 || res.status === 403) {
          // Rotar a la siguiente clave del pool
          this.currentKeyIndex++;
          if (this.currentKeyIndex < this.apiKeys.length) {
            console.log(`[GoogleFlights] 🔄 Clave agotada (HTTP ${res.status}). Rotando a la clave #${this.currentKeyIndex + 1} del pool...`);
            return this.fetchEndpoint(endpoint, params);
          } else if (!this.quotaExhausted) {
            console.warn('[GoogleFlights] ⚠️ Todas las claves del pool agotaron su cuota (HTTP 429). El scanner continúa con fuentes ilimitadas.');
            this.quotaExhausted = true;
          }
        } else {
          console.warn(`[GoogleFlights] HTTP ${res.status} en ${endpoint}`);
        }
        return null;
      }

      return await res.json();
    } catch (err) {
      console.error(`[GoogleFlights] Error en ${endpoint}:`, err.message);
      return null;
    }
  }

  async searchRoundtrip(dstIata, departureDate, arrivalDate) {
    const res = await this.fetchEndpoint('search-roundtrip', {
      departureId: this.origin,
      arrivalId: dstIata,
      departureDate,
      arrivalDate,
      currency: 'EUR',
    });

    const list = [
      ...(res?.data?.topFlights || []),
      ...(res?.data?.otherFlights || []),
    ];

    const fares = [];
    const meta = AIRPORT_METADATA[dstIata] || { city: dstIata, country: '' };

    for (const f of list) {
      const segOut = f.segments?.[0];
      if (!segOut) continue;

      const totalPrice = parseFloat(f.price || 0);
      if (totalPrice <= 0 || totalPrice > 65) continue;

      const airlineName = (f.airlineNames || [])[0] || f.airlineCode || 'Aerolínea';
      const flightNumber = `${f.airlineCode || ''}${segOut.flightNumber || ''}`;

      const outDepTime = `${departureDate}T${segOut.departureTime || '08:00'}:00`;
      const outArrTime = `${departureDate}T${segOut.arrivalTime || '09:00'}:00`;
      
      const inDepTime = `${arrivalDate}T20:30:00`;
      const inArrTime = `${arrivalDate}T22:15:00`;

      const diffDays = Math.round((new Date(arrivalDate) - new Date(departureDate)) / (1000 * 3600 * 24));

      fares.push({
        airline: airlineName,
        bookingUrl: `https://www.google.com/travel/flights?q=Flights%20to%20${dstIata}%20from%20BCN%20on%20${departureDate}%20through%20${arrivalDate}`,
        outbound: {
          departureAirport: { iataCode: this.origin, city: { name: 'Barcelona' } },
          arrivalAirport: { iataCode: dstIata, city: { name: meta.city }, countryName: meta.country },
          departureDate: outDepTime,
          arrivalDate: outArrTime,
          flightNumber: flightNumber || airlineName,
          price: { value: totalPrice / 2 },
        },
        inbound: {
          departureAirport: { iataCode: dstIata, city: { name: meta.city }, countryName: meta.country },
          arrivalAirport: { iataCode: this.origin, city: { name: 'Barcelona' } },
          departureDate: inDepTime,
          arrivalDate: inArrTime,
          flightNumber: airlineName,
          price: { value: totalPrice / 2 },
        },
        summary: {
          price: { value: totalPrice },
          tripDurationDays: diffDays,
        },
      });
    }

    return fares;
  }

  async scan() {
    if (!this.apiKey) return [];

    console.log(`[GoogleFlights] 🌐 Escaneando Vueling, Air Europa y legacy carriers con Google Flights...`);

    const allFares = [];

    // Fechas estratégicas de escapada (noviembre)
    const testDates = [
      { out: '2026-11-13', ret: '2026-11-15' }, // Finde 2 noches
      { out: '2026-11-20', ret: '2026-11-22' }, // Finde 2 noches
      { out: '2026-11-27', ret: '2026-11-29' }, // Finde 2 noches
    ];

    // Destinos top donde vuelan Vueling y Air Europa desde BCN
    const targets = ['IBZ', 'PMI', 'SVQ', 'MAH', 'OPO', 'RAK'];

    for (const dst of targets) {
      for (const td of testDates) {
        if (this.quotaExhausted) break;
        try {
          const fares = await this.searchRoundtrip(dst, td.out, td.ret);
          if (fares.length > 0) {
            console.log(`  [GoogleFlights] Encontrados ${fares.length} vuelos a ${dst} (${fares[0].airline} ${fares[0].summary.price.value}€)`);
            allFares.push(...fares);
          }
          await new Promise((r) => setTimeout(r, 350));
        } catch (err) {
          console.error(`  [GoogleFlights] Error en ${dst}:`, err.message);
        }
      }
    }

    console.log(`[GoogleFlights] 📦 Total tarifas capturadas: ${allFares.length}`);
    return allFares;
  }
}

