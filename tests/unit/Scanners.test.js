import { describe, it, expect, vi, afterEach } from 'vitest';
import { RyanairScanner } from '../../src/Scanners/RyanairScanner.js';
import { GoogleFlightsScanner } from '../../src/Scanners/GoogleFlightsScanner.js';
import { SkyscannerScanner } from '../../src/Scanners/SkyscannerScanner.js';

describe('Scanners', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('RyanairScanner fetches, deduplicates, and handles HTTP/network errors', async () => {
    const scanner = new RyanairScanner({ originAirport: 'BCN', priorityDestinations: ['OPO'], searchDaysAhead: 30 });
    const range = scanner.getDateRange(30);
    expect(range.fromDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(range.toDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    const sampleFare = { outbound: { flightKey: 'OUT1' }, inbound: { flightKey: 'IN1' } };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ fares: [sampleFare, sampleFare] }) }));
    const fares = await scanner.scan();
    expect(fares).toHaveLength(1);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    expect(await scanner.fetchFares({ market: 'es' })).toEqual([]);

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('timeout')));
    expect(await scanner.fetchFares({ market: 'es' })).toEqual([]);
  });

  it('GoogleFlightsScanner rotates API keys on 429 and parses roundtrips', async () => {
    const scanner = new GoogleFlightsScanner({ originAirport: 'BCN' });
    scanner.apiKeys = ['k1', 'k2'];
    scanner.currentKeyIndex = 0;

    const mockFetch = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 429 })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            topFlights: [{
              price: '42',
              airlineNames: ['Vueling'],
              airlineCode: 'VY',
              segments: [{ flightNumber: '1234', departureTime: '08:00', arrivalTime: '09:30' }],
            }],
          },
        }),
      });
    vi.stubGlobal('fetch', mockFetch);

    const fares = await scanner.searchRoundtrip('PMI', '2026-11-20', '2026-11-22');
    expect(fares).toHaveLength(1);
    expect(fares[0].airline).toBe('Vueling');
    expect(scanner.currentKeyIndex).toBe(1);

    scanner.apiKeys = [];
    expect(await scanner.fetchEndpoint('search-roundtrip')).toBeNull();
    expect(await scanner.scan()).toEqual([]);
  });

  it('SkyscannerScanner parses direct flights and ignores stops/expensive fares', async () => {
    const scanner = new SkyscannerScanner({ priorityDestinations: ['PMI'] });
    scanner.apiKey = 'test-key';

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          flights: { days: [{ day: '2026-11-25', price: 20 }] },
          itineraries: [
            {
              price: { raw: 39 },
              legs: [
                { stopCount: 0, departure: '2026-11-25T07:00:00', arrival: '2026-11-25T08:00:00', carriers: { marketing: [{ name: 'Vueling' }] }, segments: [{ flightNumber: 'VY1' }] },
                { stopCount: 0, departure: '2026-11-25T21:00:00', arrival: '2026-11-25T22:00:00', carriers: { marketing: [{ name: 'Vueling' }] }, segments: [{ flightNumber: 'VY2' }] },
              ],
            },
            {
              price: { raw: 30 },
              legs: [{ stopCount: 1 }, { stopCount: 0 }],
            },
          ],
        },
      }),
    }));

    const days = await scanner.getPriceCalendar('PMI', '2026-11-20');
    expect(days).toHaveLength(1);
    expect(await scanner.getPriceCalendar('UNKNOWN', '2026-11-20')).toEqual([]);

    const flights = await scanner.searchFlights('PMI', '2026-11-25', '2026-11-25');
    expect(flights).toHaveLength(1);
    expect(flights[0].airline).toBe('Vueling');

    scanner.apiKey = '';
    expect(await scanner.scan()).toEqual([]);
  });
});
