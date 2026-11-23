import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_LOG_FILE = path.resolve(__dirname, '../../storage/logs/app_errors.jsonl');

/**
 * Logger estructurado fail-safe con soporte opcional para SENTRY_DSN desde .env.
 * Nunca lanza excepciones para no interrumpir la ejecución principal.
 */
export class ErrorLogger {
  /**
   * @param {{ logFile?: string, sentryDsn?: string, service?: string }} [options]
   */
  constructor(options = {}) {
    this.logFile = options.logFile || DEFAULT_LOG_FILE;
    this.sentryDsn = options.sentryDsn ?? (process.env.SENTRY_DSN || '');
    this.service = options.service || 'vuelos-martin-node';
  }

  /**
   * @param {'info'|'warn'|'error'} level
   * @param {string} message
   * @param {Record<string, unknown>} [context]
   */
  log(level, message, context = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      service: this.service,
      message,
      sentryConfigured: Boolean(this.sentryDsn),
      context,
    };

    try {
      const dir = path.dirname(this.logFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.appendFileSync(this.logFile, `${JSON.stringify(entry)}\n`, 'utf8');
    } catch {
      // Fail-safe: nunca romper la app si falla la escritura de logs
    }

    return entry;
  }

  /**
   * @param {unknown} err
   * @param {Record<string, unknown>} [context]
   */
  captureException(err, context = {}) {
    const errorObj = err instanceof Error ? err : new Error(String(err));
    return this.log('error', errorObj.message, {
      ...context,
      name: errorObj.name,
      stack: errorObj.stack ? errorObj.stack.split('\n').slice(0, 4).join(' | ') : '',
    });
  }

  installGlobalHandlers() {
    process.on('uncaughtException', (err) => {
      this.captureException(err, { origin: 'uncaughtException' });
    });
    process.on('unhandledRejection', (reason) => {
      this.captureException(reason, { origin: 'unhandledRejection' });
    });
  }
}

export const defaultLogger = new ErrorLogger();
