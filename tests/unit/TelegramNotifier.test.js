import { describe, it, expect, vi, afterEach } from 'vitest';
import { TelegramNotifier } from '../../src/Notifier/TelegramNotifier.js';

const sampleDeal = {
  mode: 'daytrip',
  airline: 'Ryanair',
  destinationIata: 'OPO',
  destinationCity: 'Oporto',
  destinationCountry: 'Portugal',
  totalPrice: 24.5,
  usefulHours: 12.5,
  bookingUrl: 'https://www.ryanair.com',
  outbound: {
    flightNumber: 'FR101',
    departureDate: '2026-12-10T07:00:00',
    arrivalDate: '2026-12-10T08:30:00',
  },
  inbound: {
    flightNumber: 'FR102',
    departureDate: '2026-12-10T21:00:00',
    arrivalDate: '2026-12-10T22:30:00',
  },
};

describe('TelegramNotifier', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('formats flags and messages for all 3 trip modes', () => {
    const notifier = new TelegramNotifier();
    expect(notifier.getFlag('Portugal')).toBe('🇵🇹');
    expect(notifier.getFlag('Desconocido')).toBe('✈️');

    const dtMsg = notifier.formatMessage(sampleDeal);
    expect(dtMsg).toContain('EXPRESS DAY-TRIP');
    expect(dtMsg).toContain('Oporto (OPO)');
    expect(dtMsg).toContain('24.50 €');

    expect(notifier.formatMessage({ ...sampleDeal, mode: 'weekend' })).toContain('FINDE RELÁMPAGO');
    expect(notifier.formatMessage({ ...sampleDeal, mode: 'bridge' })).toContain('ESCAPADA 2 NOCHES');
  });

  it('handles missing credentials, successful sends, API errors, and network failures', async () => {
    const notifier = new TelegramNotifier();
    notifier.token = '';
    notifier.chatId = '';
    expect(await notifier.sendDeal(sampleDeal)).toBe(false);
    expect(await notifier.sendSimpleMessage('hola')).toBe(false);

    notifier.token = 'fake-token';
    notifier.chatId = '12345';

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) }));
    expect(await notifier.sendDeal(sampleDeal)).toBe(true);
    expect(await notifier.sendSimpleMessage('hola')).toBe(true);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: false, description: 'Bad Request' }) }));
    expect(await notifier.sendDeal(sampleDeal)).toBe(false);

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
    expect(await notifier.sendDeal(sampleDeal)).toBe(false);
    expect(await notifier.sendSimpleMessage('hola')).toBe(false);
  });
});
