import { COUNTRY_FLAGS, showToast } from './constants.js';

/**
 * Controlador del Radar de Chollos (carga, filtrado, ordenamiento, tarjetas y Telegram)
 */
export class RadarController {
  constructor() {
    /** @type {any[]} */
    this.allDeals = [];
    this.stats = {};
    this.currentMode = 'all';
    this.currentMaxPrice = Infinity;
    this.currentSort = 'date-asc';
    this.searchQuery = '';

    this.dealsContainer = document.getElementById('dealsContainer');
    this.dealsCountBadge = document.getElementById('dealsCountBadge');
    this.lastUpdatedEl = document.getElementById('lastUpdated');
    this.statTotalEl = document.getElementById('statTotal');
    this.statDaytripEl = document.getElementById('statDaytrip');
    this.statCheapestEl = document.getElementById('statCheapest');
    this.statMaxHoursEl = document.getElementById('statMaxHours');
    this.searchInput = /** @type {HTMLInputElement | null} */ (document.getElementById('searchInput'));
    this.sortSelect = /** @type {HTMLSelectElement | null} */ (document.getElementById('sortSelect'));
    this.tabButtons = document.querySelectorAll('.tab-btn');
    this.priceChips = document.querySelectorAll('.price-chip');
    this.scanManualBtn = /** @type {HTMLButtonElement | null} */ (document.getElementById('scanManualBtn'));
    this.scanBtnText = document.getElementById('scanBtnText');
  }

  bindEvents() {
    if (this.scanManualBtn) {
      this.scanManualBtn.addEventListener('click', () => this.triggerManualScan());
    }

    this.tabButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        this.tabButtons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentMode = /** @type {HTMLElement} */ (btn).dataset.mode || 'all';
        this.render();
      });
    });

    this.priceChips.forEach((chip) => {
      chip.addEventListener('click', () => {
        this.priceChips.forEach((c) => c.classList.remove('active'));
        chip.classList.add('active');
        const price = /** @type {HTMLElement} */ (chip).dataset.price || 'all';
        this.currentMaxPrice = price === 'all' ? Infinity : parseFloat(price);
        this.render();
      });
    });

    if (this.searchInput) {
      this.searchInput.addEventListener('input', (e) => {
        this.searchQuery = /** @type {HTMLInputElement} */ (e.target).value.trim().toLowerCase();
        this.render();
      });
    }

    if (this.sortSelect) {
      this.sortSelect.addEventListener('change', (e) => {
        this.currentSort = /** @type {HTMLSelectElement} */ (e.target).value;
        this.render();
      });
    }
  }

  async loadDeals() {
    try {
      const res = await fetch(`data/deals.json?t=${Date.now()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      this.applyDealsData(data);
    } catch {
      try {
        const resApi = await fetch('api.php');
        const dataApi = await resApi.json();
        this.applyDealsData(dataApi);
      } catch {
        if (this.dealsContainer) {
          this.dealsContainer.innerHTML = `
            <div class="empty-state">
              <div class="empty-icon">📡</div>
              <div class="empty-title">Sin conexión con el radar</div>
              <div class="empty-desc">No se pudieron cargar los vuelos. Intentá nuevamente en unos instantes.</div>
            </div>
          `;
        }
      }
    }
  }

  /** @param {any} data */
  applyDealsData(data) {
    this.allDeals = data.deals || [];
    this.stats = data.stats || {};
    this.render();
    this.updateLastUpdated(data.updatedAt);
  }

  async triggerManualScan() {
    if (!this.scanManualBtn || this.scanManualBtn.disabled) return;
    this.scanManualBtn.disabled = true;
    if (this.scanBtnText) this.scanBtnText.innerText = 'Rastreando...';
    this.scanManualBtn.classList.add('scanning');

    try {
      const res = await fetch('api.php?action=scan');
      const data = await res.json();
      if (data.status) {
        showToast(`✨ ${data.message} (${data.totalDeals} vuelos aprobados)`);
        await this.loadDeals();
      } else {
        showToast('⚠️ Hubo un detalle en el rastreo en vivo.');
      }
    } catch {
      showToast('❌ Error de conexión al rastrear.');
    } finally {
      this.scanManualBtn.disabled = false;
      if (this.scanBtnText) this.scanBtnText.innerText = 'Rastrear Ahora';
      this.scanManualBtn.classList.remove('scanning');
    }
  }

  /** @param {string | undefined} isoString */
  updateLastUpdated(isoString) {
    if (!this.lastUpdatedEl || !isoString) return;
    const date = new Date(isoString);
    const pad = (/** @type {number} */ n) => n.toString().padStart(2, '0');
    this.lastUpdatedEl.innerHTML = `<span class="live-dot"></span> Actualizado: ${pad(date.getDate())}/${pad(date.getMonth() + 1)} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  getFilteredDeals() {
    const query = this.searchQuery;
    const filtered = this.allDeals.filter((deal) => {
      if (this.currentMode !== 'all' && deal.mode !== this.currentMode) return false;
      if (deal.totalPrice > this.currentMaxPrice) return false;
      if (!query) return true;
      const haystack = `${deal.destinationCity || ''} ${deal.destinationCountry || ''} ${deal.destinationIata || ''} ${deal.airline || ''}`.toLowerCase();
      return haystack.includes(query);
    });

    return filtered.sort((a, b) => {
      if (this.currentSort === 'date-asc') {
        return new Date(a.outbound.departureDate).getTime() - new Date(b.outbound.departureDate).getTime();
      }
      if (this.currentSort === 'price-asc') return a.totalPrice - b.totalPrice;
      if (this.currentSort === 'hours-desc') return b.usefulHours - a.usefulHours;
      return b.ratio - a.ratio;
    });
  }

  render() {
    if (!this.dealsContainer) return;
    const filtered = this.getFilteredDeals();
    this.renderStats(filtered);

    if (this.dealsCountBadge) {
      this.dealsCountBadge.innerText = `${filtered.length} vuelos encontrados`;
    }

    if (filtered.length === 0) {
      this.dealsContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">✈️</div>
          <div class="empty-title">Sin vuelos con estos filtros</div>
          <div class="empty-desc">Probá cambiando la modalidad o ampliando el rango de precio máximo.</div>
        </div>
      `;
      return;
    }

    this.dealsContainer.innerHTML = filtered.map((deal) => this.renderDealCard(deal)).join('');
  }

  /** @param {any[]} filtered */
  renderStats(filtered) {
    if (this.statTotalEl) this.statTotalEl.innerText = String(this.allDeals.length);
    if (this.statDaytripEl) {
      this.statDaytripEl.innerText = String(this.allDeals.filter((d) => d.mode === 'daytrip').length);
    }

    if (filtered.length === 0) {
      if (this.statCheapestEl) this.statCheapestEl.innerText = '--';
      if (this.statMaxHoursEl) this.statMaxHoursEl.innerText = '--';
      return;
    }

    const minPrice = Math.min(...filtered.map((d) => d.totalPrice));
    const maxHours = Math.max(...filtered.map((d) => d.usefulHours));
    if (this.statCheapestEl) this.statCheapestEl.innerText = `${minPrice.toFixed(0)} €`;
    if (this.statMaxHoursEl) this.statMaxHoursEl.innerText = `${maxHours.toFixed(1)} h`;
  }

  /** @param {any} deal */
  renderDealCard(deal) {
    const flag = COUNTRY_FLAGS[/** @type {keyof typeof COUNTRY_FLAGS} */ (deal.destinationCountry)] || '✈️';
    const isDaytrip = deal.mode === 'daytrip';
    const isWeekend = deal.mode === 'weekend';
    const modeBadgeClass = isDaytrip ? 'badge-daytrip' : isWeekend ? 'badge-weekend' : 'badge-bridge';
    const modeText = isDaytrip ? '⚡ Express Day-Trip' : isWeekend ? '🎒 Finde (1 Noche)' : '🌉 Escapada 2 Noches';

    const outDateObj = new Date(deal.outbound.departureDate);
    const inDateObj = new Date(deal.inbound.departureDate);
    const dateFormatted = outDateObj.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
    const fmt = (/** @type {Date} */ d) => d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    const btnId = `tg_btn_${deal.destinationIata}_${deal.mode}_${Math.round(deal.totalPrice)}`;
    const newBadgeHtml = deal.isNew ? '<span class="badge-new-deal" title="Chollo cazado recientemente">✨ Nuevo</span>' : '';
    const airlineSlug = (deal.airline || '').toLowerCase().replace(/[^a-z0-9]/g, '-');
    const hotelLabel = isDaytrip ? '0 € (Dormís en casa)' : isWeekend ? '1 noche' : '2 noches';

    return `
      <article class="deal-card ${isDaytrip ? 'is-daytrip' : ''}">
        <div class="deal-header">
          <div class="deal-badge-row">
            <span class="mode-badge ${modeBadgeClass}">${modeText}</span>
            <div class="badge-group-right">
              ${newBadgeHtml}
              <span class="airline-tag airline-${airlineSlug}">${deal.airline || 'Aerolínea'}</span>
            </div>
          </div>
          <span class="deal-date">${dateFormatted}</span>
        </div>
        <div class="deal-body">
          <div class="deal-route">
            <div class="dest-info">
              <span class="dest-flag">${flag}</span>
              <div>
                <h2 class="dest-city">${deal.destinationCity}</h2>
                <span class="dest-country">${deal.destinationCountry}</span>
              </div>
            </div>
            <span class="dest-iata">${deal.destinationIata}</span>
          </div>
          <div class="deal-timeline">
            <div class="leg">
              <span class="leg-type">🛫 Ida</span>
              <div class="leg-times"><span>${fmt(outDateObj)}</span><span class="leg-arrow">➔</span><span>${fmt(new Date(deal.outbound.arrivalDate))}</span></div>
              <span class="leg-flight">${deal.outbound.flightNumber}</span>
            </div>
            <div class="leg">
              <span class="leg-type">🛬 Vuelta</span>
              <div class="leg-times"><span>${fmt(inDateObj)}</span><span class="leg-arrow">➔</span><span>${fmt(new Date(deal.inbound.arrivalDate))}</span></div>
              <span class="leg-flight">${deal.inbound.flightNumber}</span>
            </div>
          </div>
          <div class="deal-metrics">
            <div class="metric-item"><span class="metric-label">Tiempo Útil</span><span class="metric-val">${deal.usefulHours.toFixed(1)} horas</span></div>
            <div class="metric-item"><span class="metric-label">Ratio Chollo</span><span class="metric-val">${deal.ratio.toFixed(2)} h/€</span></div>
            <div class="metric-item"><span class="metric-label">Alojamiento</span><span class="metric-val ${isDaytrip ? 'hotel-zero' : ''}">${hotelLabel}</span></div>
          </div>
        </div>
        <div class="deal-footer">
          <div class="deal-price-wrap">
            <span class="price-sub">Ida y Vuelta</span>
            <div class="price-amount">${deal.totalPrice.toFixed(2)}<span class="price-currency">€</span></div>
          </div>
          <div class="deal-actions">
            <button id="${btnId}" class="tg-send-btn" onclick='window.app.sendTelegram(${JSON.stringify(deal)})' title="Reenviar a mi Telegram">📲 Telegram</button>
            <a href="${deal.bookingUrl}" target="_blank" rel="noopener noreferrer" class="book-btn">Reservar ➔</a>
          </div>
        </div>
      </article>
    `;
  }

  /** @param {any} deal */
  async sendTelegram(deal) {
    const btnId = `tg_btn_${deal.destinationIata}_${deal.mode}_${Math.round(deal.totalPrice)}`;
    const btn = /** @type {HTMLButtonElement | null} */ (document.getElementById(btnId));
    if (btn) {
      btn.disabled = true;
      btn.innerText = 'Enviando...';
    }

    try {
      const params = new URLSearchParams({
        action: 'send_telegram',
        iata: deal.destinationIata,
        city: deal.destinationCity,
        price: deal.totalPrice.toFixed(2),
        hours: deal.usefulHours.toFixed(1),
        mode: deal.mode,
        airline: deal.airline || 'Aerolínea',
        url: deal.bookingUrl || 'https://www.ryanair.com',
      });
      const res = await fetch(`api.php?${params.toString()}`);
      const data = await res.json();
      if (data.status) {
        showToast(`✈️ ¡Enviado a tu Telegram! BCN ➔ ${deal.destinationCity}`);
        if (btn) btn.innerText = '✅ Enviado';
      } else {
        showToast('⚠️ No se pudo enviar a Telegram.');
        if (btn) btn.innerText = '📲 Telegram';
      }
    } catch {
      showToast('❌ Error de conexión al enviar.');
      if (btn) btn.innerText = '📲 Telegram';
    } finally {
      if (btn) setTimeout(() => { btn.disabled = false; }, 2000);
    }
  }
}
