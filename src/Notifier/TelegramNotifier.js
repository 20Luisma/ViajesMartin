import { Config } from '../../config/config.js';

const COUNTRY_FLAGS = {
  España: '🇪🇸',
  Italia: '🇮🇹',
  Portugal: '🇵🇹',
  Francia: '🇫🇷',
  Alemania: '🇩🇪',
  'Reino Unido': '🇬🇧',
  Irlanda: '🇮🇪',
  Bélgica: '🇧🇪',
  Suiza: '🇨🇭',
  Austria: '🇦🇹',
  'Países Bajos': '🇳🇱',
  Holanda: '🇳🇱',
  Polonia: '🇵🇱',
  Hungría: '🇭🇺',
  'República Checa': '🇨🇿',
  Marruecos: '🇲🇦',
  Suecia: '🇸🇪',
  Dinamarca: '🇩🇰',
  Noruega: '🇳🇴',
  Grecia: '🇬🇷',
  Croacia: '🇭🇷',
  Eslovaquia: '🇸🇰',
};

export class TelegramNotifier {
  constructor() {
    this.token = Config.telegram.botToken;
    this.chatId = Config.telegram.chatId;
  }

  getFlag(countryName) {
    return COUNTRY_FLAGS[countryName] || '✈️';
  }

  formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-ES', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  }

  formatTime(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }

  formatMessage(deal) {
    const flag = this.getFlag(deal.destinationCountry);
    const modeBadge =
      deal.mode === 'daytrip'
        ? '⚡ *EXPRESS DAY-TRIP* (En el día • 0 € Hotel)'
        : deal.mode === 'weekend'
        ? '🎒 *FINDE RELÁMPAGO* (1 Noche)'
        : '🌉 *ESCAPADA 2 NOCHES*';

    const outDepTime = this.formatTime(deal.outbound.departureDate);
    const outArrTime = this.formatTime(deal.outbound.arrivalDate);
    const inDepTime = this.formatTime(deal.inbound.departureDate);
    const inArrTime = this.formatTime(deal.inbound.arrivalDate);

    const outDate = this.formatDate(deal.outbound.departureDate);
    const inDate = this.formatDate(deal.inbound.departureDate);

    const dateLine =
      deal.mode === 'daytrip'
        ? `📅 *Fecha:* ${outDate}`
        : `📅 *Fechas:* ${outDate} ➔ ${inDate}`;

    const airline = deal.airline || 'Ryanair';

    return [
      `🚨 ${modeBadge}`,
      ``,
      `${flag} *BCN ➔ ${deal.destinationCity} (${deal.destinationIata})*`,
      `✈️ *Compañía:* ${airline}`,
      `${dateLine}`,
      ``,
      `🛫 *Ida:* ${outDepTime} ➔ ${outArrTime} (${deal.outbound.flightNumber})`,
      `🛬 *Vuelta:* ${inDepTime} ➔ ${inArrTime} (${deal.inbound.flightNumber})`,
      ``,
      `⏱️ *Tiempo útil en destino:* ${deal.usefulHours.toFixed(1)} horas`,
      `💶 *Precio Total i/v:* *${deal.totalPrice.toFixed(2)} €*`,
      ``,
      `🔗 [Reservar Vuelo Directo](${deal.bookingUrl})`,
    ].join('\n');
  }

  async sendDeal(deal) {
    if (!this.token || !this.chatId) {
      console.warn('[Notifier] Faltan credenciales de Telegram.');
      return false;
    }

    const text = this.formatMessage(deal);
    const url = `https://api.telegram.org/bot${this.token}/sendMessage`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: this.chatId,
          text,
          parse_mode: 'Markdown',
          disable_web_page_preview: false,
        }),
      });

      const resJson = await response.json();
      if (!resJson.ok) {
        console.error('[Notifier] Error enviando mensaje a Telegram:', resJson.description);
        return false;
      }
      return true;
    } catch (err) {
      console.error('[Notifier] Error de red:', err.message);
      return false;
    }
  }

  async sendSimpleMessage(text) {
    if (!this.token || !this.chatId) return false;
    const url = `https://api.telegram.org/bot${this.token}/sendMessage`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: this.chatId,
          text,
          parse_mode: 'Markdown',
        }),
      });
      return response.ok;
    } catch (err) {
      console.error('[Notifier] Error enviando mensaje simple:', err.message);
      return false;
    }
  }
}
