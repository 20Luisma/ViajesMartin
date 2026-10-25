import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultStoragePath = path.resolve(__dirname, '../../storage/alerts_history.json');

export class AlertHistory {
  constructor(filePath = defaultStoragePath) {
    this.filePath = filePath;
    this.history = this.load();
  }

  load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.error('[AlertHistory] Error cargando historial:', err.message);
    }
    return {};
  }

  save() {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.filePath, JSON.stringify(this.history, null, 2), 'utf8');
    } catch (err) {
      console.error('[AlertHistory] Error guardando historial:', err.message);
    }
  }

  getDealKey(deal) {
    const outDate = deal.outbound.departureDate.split('T')[0];
    const inDate = deal.inbound.departureDate.split('T')[0];
    return `${deal.destinationIata}_${outDate}_${inDate}_${deal.outbound.flightNumber}_${deal.inbound.flightNumber}`;
  }

  shouldAlert(deal) {
    const key = this.getDealKey(deal);
    const existing = this.history[key];

    if (!existing) {
      return true;
    }

    // Si ya se avisó, solo re-avisar si el precio bajó al menos 4 euros
    if (deal.totalPrice < existing.lastPrice - 4) {
      return true;
    }

    return false;
  }

  recordAlert(deal) {
    const key = this.getDealKey(deal);
    this.history[key] = {
      dealKey: key,
      destinationIata: deal.destinationIata,
      destinationCity: deal.destinationCity,
      totalPrice: deal.totalPrice,
      lastPrice: deal.totalPrice,
      mode: deal.mode,
      outDate: deal.outbound.departureDate,
      inDate: deal.inbound.departureDate,
      alertedAt: new Date().toISOString(),
    };
    this.save();
  }
}
