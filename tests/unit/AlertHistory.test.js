import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { AlertHistory } from '../../src/Storage/AlertHistory.js';

describe('AlertHistory', () => {
  let tmpDir;
  let historyFile;

  const sampleDeal = {
    destinationIata: 'OPO',
    destinationCity: 'Oporto',
    totalPrice: 30,
    mode: 'daytrip',
    outbound: { flightNumber: 'FR101', departureDate: '2026-12-10T07:00:00' },
    inbound: { flightNumber: 'FR102', departureDate: '2026-12-10T21:00:00' },
  };

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vuelos-history-'));
    historyFile = path.join(tmpDir, 'alerts_history.json');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('records alerts, suppresses duplicates, and re-alerts on >= 4 EUR price drop', () => {
    const history = new AlertHistory(historyFile);
    expect(history.shouldAlert(sampleDeal)).toBe(true);

    history.recordAlert(sampleDeal);
    expect(history.shouldAlert(sampleDeal)).toBe(false);
    expect(history.shouldAlert({ ...sampleDeal, totalPrice: 27 })).toBe(false);
    expect(history.shouldAlert({ ...sampleDeal, totalPrice: 25 })).toBe(true);

    const reloaded = new AlertHistory(historyFile);
    expect(reloaded.shouldAlert(sampleDeal)).toBe(false);
  });

  it('recovers gracefully when history file contains invalid JSON', () => {
    fs.writeFileSync(historyFile, '{invalid-json', 'utf8');
    const history = new AlertHistory(historyFile);
    expect(history.shouldAlert(sampleDeal)).toBe(true);
  });
});
