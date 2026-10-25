import fs from 'node:fs';
import { RyanairScanner } from './Scanners/RyanairScanner.js';
import { GoogleFlightsScanner } from './Scanners/GoogleFlightsScanner.js';
import { FlightFilter } from './Core/FlightFilter.js';
import { TelegramNotifier } from './Notifier/TelegramNotifier.js';
import { AlertHistory } from './Storage/AlertHistory.js';
import { Config } from '../config/config.js';

class FlightDealHunter {
  constructor() {
    this.ryanairScanner = new RyanairScanner(Config.settings);
    this.googleFlightsScanner = new GoogleFlightsScanner(Config.settings);
    this.filter = new FlightFilter(Config.settings);
    this.notifier = new TelegramNotifier();
    this.history = new AlertHistory();
  }

  async runScan(options = { notify: true }) {
    console.log(`\n======================================================`);
    console.log(`🚀 [Hunter] Iniciando ciclo de búsqueda inteligente multi-aerolínea...`);
    console.log(`⏰ Hora actual: ${new Date().toLocaleString('es-ES')}`);
    console.log(`======================================================\n`);

    const [ryanairFares, googleFares] = await Promise.all([
      this.ryanairScanner.scan(),
      this.googleFlightsScanner.scan(),
    ]);

    const rawFares = [...ryanairFares, ...googleFares];
    const deals = this.filter.filterFares(rawFares);

    console.log(`\n🎯 [Hunter] Chollos válidos que cumplen todos los filtros: ${deals.length}`);

    let alertedCount = 0;

    for (const deal of deals) {
      const modeEmoji = deal.mode === 'daytrip' ? '⚡' : deal.mode === 'weekend' ? '🎒' : '🌉';
      console.log(
        `${modeEmoji} [${deal.mode.toUpperCase()}] ${deal.destinationCity} (${deal.destinationIata}) | ` +
        `${deal.totalPrice.toFixed(2)}€ | Horas útiles: ${deal.usefulHours.toFixed(1)}h | Ratio: ${deal.ratio.toFixed(2)}`
      );

      if (options.notify) {
        if (this.history.shouldAlert(deal)) {
          console.log(`  🔔 Enviando alerta push a Telegram...`);
          const sent = await this.notifier.sendDeal(deal);
          if (sent) {
            this.history.recordAlert(deal);
            alertedCount++;
            // Pausa de cortesía para no saturar Telegram
            await new Promise((r) => setTimeout(r, 1200));
          }
        } else {
          console.log(`  ⏭️ Ya alertado previamente o precio estable, se omite spam.`);
        }
      }
    }

    console.log(`\n✅ [Hunter] Ciclo finalizado. Alertas nuevas emitidas: ${alertedCount}`);

    // Exportar datos a public/data/deals.json para la interfaz web
    this.exportToWeb(deals);

    return deals;
  }

  exportToWeb(deals) {
    try {
      const exportPath = new URL('../public/data/deals.json', import.meta.url);
      const data = {
        updatedAt: new Date().toISOString(),
        origin: Config.settings.originAirport || 'BCN',
        totalDeals: deals.length,
        stats: {
          cheapestPrice: deals.length > 0 ? Math.min(...deals.map((d) => d.totalPrice)) : 0,
          maxUsefulHours: deals.length > 0 ? Math.max(...deals.map((d) => d.usefulHours)) : 0,
          daytripsCount: deals.filter((d) => d.mode === 'daytrip').length,
          weekendsCount: deals.filter((d) => d.mode === 'weekend').length,
          bridgesCount: deals.filter((d) => d.mode === 'bridge').length,
          destinationsCount: new Set(deals.map((d) => d.destinationIata)).size,
        },
        deals,
      };

      fs.writeFileSync(exportPath, JSON.stringify(data, null, 2), 'utf8');
      console.log(`🌐 [Web] Datos exportados exitosamente a public/data/deals.json`);
    } catch (err) {
      console.error('[Web] Error exportando datos para la web:', err.message);
    }
  }

  startDaemon() {
    const minutes = Config.settings.scanIntervalMinutes || 60;
    console.log(`🛡️ [Daemon] Modo continuo activado. Frecuencia de rastreo: cada ${minutes} minutos.`);

    // Ejecutar el primer escaneo de inmediato
    this.runScan({ notify: true });

    // Programar repetición periódica
    setInterval(() => {
      this.runScan({ notify: true });
    }, minutes * 60 * 1000);
  }
}

// Punto de entrada CLI
const args = process.argv.slice(2);
const hunter = new FlightDealHunter();

if (args.includes('--once')) {
  hunter.runScan({ notify: true }).then(() => process.exit(0));
} else {
  hunter.startDaemon();
}
