import { describe, it, expect } from 'vitest';
import { FlightFilter } from '../../src/Core/FlightFilter.js';

const mockSettings = {
  blacklistedAirports: ['BVA', 'HHN'],
  priorityDestinations: ['OPO', 'PMI'],
  thresholds: {
    daytrip: {
      maxPrice: 40,
      minUsefulHours: 9,
      outboundMaxDepartureTime: '09:30',
      inboundMinDepartureTime: '19:45',
    },
    weekend: { maxPrice: 55, minUsefulHours: 24 },
    bridge: { maxPrice: 65, minUsefulHours: 42 },
  },
};

function buildFare(overrides = {}) {
  return {
    outbound: {
      flightNumber: 'FR101',
      departureDate: '2026-12-10T07:00:00',
      arrivalDate: '2026-12-10T08:30:00',
      price: { value: 14 },
      arrivalAirport: { iataCode: 'OPO', city: { name: 'Oporto' }, countryName: 'Portugal' },
      ...(overrides.outbound || {}),
    },
    inbound: {
      flightNumber: 'FR102',
      departureDate: '2026-12-10T21:00:00',
      arrivalDate: '2026-12-10T22:30:00',
      price: { value: 15 },
      ...(overrides.inbound || {}),
    },
    summary: {
      price: { value: 29 },
      tripDurationDays: 0,
      ...(overrides.summary || {}),
    },
    ...(overrides.extra || {}),
  };
}

describe('FlightFilter', () => {
  const filter = new FlightFilter(mockSettings);

  it('identifies blacklisted and priority airports case-insensitively', () => {
    expect(filter.isBlacklisted('bva')).toBe(true);
    expect(filter.isBlacklisted('OPO')).toBe(false);
    expect(filter.isPriority('opo')).toBe(true);
    expect(filter.isPriority('FCO')).toBe(false);
  });

  it('approves valid daytrip, weekend, and bridge fares', () => {
    const dt = filter.evaluateFare(buildFare());
    expect(dt).not.toBeNull();
    expect(dt.mode).toBe('daytrip');
    expect(dt.usefulHours).toBe(12.5);
    expect(dt.isPriority).toBe(true);

    const wk = filter.evaluateFare(
      buildFare({
        inbound: { departureDate: '2026-12-11T20:00:00', arrivalDate: '2026-12-11T21:30:00' },
        summary: { price: { value: 45 }, tripDurationDays: 1 },
      })
    );
    expect(wk?.mode).toBe('weekend');

    const br = filter.evaluateFare(
      buildFare({
        inbound: { departureDate: '2026-12-12T20:00:00', arrivalDate: '2026-12-12T21:30:00' },
        summary: { price: { value: 60 }, tripDurationDays: 2 },
      })
    );
    expect(br?.mode).toBe('bridge');
  });

  it('rejects invalid, blacklisted, overpriced, short, or >2-night fares', () => {
    expect(filter.evaluateFare({})).toBeNull();
    expect(filter.evaluateFare(buildFare({ outbound: { arrivalAirport: { iataCode: 'BVA' } } }))).toBeNull();
    expect(filter.evaluateFare(buildFare({ summary: { price: { value: 50 }, tripDurationDays: 0 } }))).toBeNull();
    expect(filter.evaluateFare(buildFare({ outbound: { departureDate: '2026-12-10T10:30:00', arrivalDate: '2026-12-10T11:30:00' } }))).toBeNull();
    expect(filter.evaluateFare(buildFare({ inbound: { departureDate: '2026-12-10T18:00:00', arrivalDate: '2026-12-10T19:30:00' } }))).toBeNull();
    expect(filter.evaluateFare(buildFare({ inbound: { departureDate: '2026-12-10T07:00:00', arrivalDate: '2026-12-10T08:00:00' } }))).toBeNull();
    expect(filter.evaluateFare(buildFare({ summary: { price: { value: 30 }, tripDurationDays: 3 } }))).toBeNull();
  });

  it('deduplicates keeping lowest price and sorts priority first then by ratio', () => {
    const expensiveOpo = buildFare({ summary: { price: { value: 35 }, tripDurationDays: 0 } });
    const cheapOpo = buildFare({ summary: { price: { value: 22 }, tripDurationDays: 0 } });
    const nonPriority = buildFare({
      outbound: { arrivalAirport: { iataCode: 'FCO', city: { name: 'Roma' }, countryName: 'Italia' } },
      summary: { price: { value: 20 }, tripDurationDays: 0 },
    });

    const deals = filter.filterFares([nonPriority, expensiveOpo, cheapOpo]);
    expect(deals).toHaveLength(2);
    expect(deals[0].destinationIata).toBe('OPO');
    expect(deals[0].totalPrice).toBe(22);
    expect(deals[1].destinationIata).toBe('FCO');
  });
});
