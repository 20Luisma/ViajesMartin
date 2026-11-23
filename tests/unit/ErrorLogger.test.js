import { describe, it, expect, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ErrorLogger } from '../../src/Core/ErrorLogger.js';
import { Config } from '../../config/config.js';

describe('ErrorLogger and Config', () => {
  const dirs = [];

  afterEach(() => {
    while (dirs.length > 0) {
      fs.rmSync(dirs.pop(), { recursive: true, force: true });
    }
  });

  it('writes structured JSON logs and captures exceptions fail-safely', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vuelos-logs-'));
    dirs.push(tmpDir);
    const logFile = path.join(tmpDir, 'errors.jsonl');

    const logger = new ErrorLogger({ logFile, sentryDsn: '' });
    const infoEntry = logger.log('info', 'scan started', { origin: 'BCN' });
    expect(infoEntry.level).toBe('info');
    expect(infoEntry.sentryConfigured).toBe(false);

    const errEntry = logger.captureException(new Error('boom'), { step: 'scan' });
    expect(errEntry.level).toBe('error');
    expect(errEntry.message).toBe('boom');

    const lines = fs.readFileSync(logFile, 'utf8').trim().split('\n');
    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[1]).context.step).toBe('scan');

    const strEntry = logger.captureException('plain failure');
    expect(strEntry.message).toBe('plain failure');
  });

  it('exposes Config structure safely', () => {
    expect(Config).toHaveProperty('telegram');
    expect(Config).toHaveProperty('rapidapi');
    expect(Config).toHaveProperty('settings');
  });
});
