/**
 * Vuelos Martín - Frontend Application Logic
 * Desacoplado, reactivo y optimizado
 */

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
  Bulgaria: '🇧🇬',
  Malta: '🇲🇹',
  Luxemburgo: '🇱🇺',
  Albania: '🇦🇱',
  Rumanía: '🇷🇴',
  Rumania: '🇷🇴',
  Lituania: '🇱🇹',
  Letonia: '🇱🇻',
  Estonia: '🇪🇪',
  Jordania: '🇯🇴',
};

class VuelosApp {
  constructor() {
    this.allDeals = [];
    this.stats = {};
    this.currentMode = 'all';
    this.currentMaxPrice = Infinity;
    this.currentSort = 'date-asc';
    this.searchQuery = '';

    this.initElements();
    this.bindEvents();
    this.setupPwa();
    this.loadDeals();
  }

  initElements() {
    this.dealsContainer = document.getElementById('dealsContainer');
    this.dealsCountBadge = document.getElementById('dealsCountBadge');
    this.lastUpdatedEl = document.getElementById('lastUpdated');
    
    // Stats elements
    this.statTotalEl = document.getElementById('statTotal');
    this.statDaytripEl = document.getElementById('statDaytrip');
    this.statCheapestEl = document.getElementById('statCheapest');
    this.statMaxHoursEl = document.getElementById('statMaxHours');

    // Controls
    this.searchInput = document.getElementById('searchInput');
    this.sortSelect = document.getElementById('sortSelect');
    this.tabButtons = document.querySelectorAll('.tab-btn');
    this.priceChips = document.querySelectorAll('.price-chip');
    this.scanManualBtn = document.getElementById('scanManualBtn');
    this.scanBtnText = document.getElementById('scanBtnText');
    this.installAppBtn = document.getElementById('installAppBtn');
  }

  setupPwa() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch((err) => {
          console.warn('[PWA] Service Worker no registrado:', err);
        });
      });
    }

    let deferredPrompt = null;
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      if (this.installAppBtn) {
        this.installAppBtn.style.display = 'inline-flex';
        this.installAppBtn.addEventListener('click', async () => {
          if (!deferredPrompt) return;
          deferredPrompt.prompt();
          const { outcome } = await deferredPrompt.userChoice;
          if (outcome === 'accepted') {
            this.installAppBtn.style.display = 'none';
          }
          deferredPrompt = null;
        });
      }
    });

    window.addEventListener('appinstalled', () => {
      if (this.installAppBtn) this.installAppBtn.style.display = 'none';
      console.log('[PWA] ¡Vuelos Martín instalado como aplicación!');
    });
  }

  bindEvents() {
    // Manual scan button
    if (this.scanManualBtn) {
      this.scanManualBtn.addEventListener('click', () => this.triggerManualScan());
    }

    // Mode tabs
    this.tabButtons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        this.tabButtons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentMode = btn.dataset.mode;
        this.render();
      });
    });

    // Price chips
    this.priceChips.forEach((chip) => {
      chip.addEventListener('click', () => {
        this.priceChips.forEach((c) => c.classList.remove('active'));
        chip.classList.add('active');
        const price = chip.dataset.price;
        this.currentMaxPrice = price === 'all' ? Infinity : parseFloat(price);
        this.render();
      });
    });

    // Search input
    this.searchInput.addEventListener('input', (e) => {
      this.searchQuery = e.target.value.trim().toLowerCase();
      this.render();
    });

    // Sort select
    this.sortSelect.addEventListener('change', (e) => {
      this.currentSort = e.target.value;
      this.render();
    });
  }

  async triggerManualScan() {
    if (!this.scanManualBtn) return;
    this.scanManualBtn.classList.add('loading');
    this.scanManualBtn.disabled = true;
    if (this.scanBtnText) this.scanBtnText.textContent = 'Rastreando...';

    try {
      const maxP = Number.isFinite(this.currentMaxPrice) ? this.currentMaxPrice : 65;
      const res = await fetch(`api.php?action=scan&max_price=${maxP}`);
      const data = await res.json();
      if (data.status) {
        await this.loadDeals();
        if (this.scanBtnText) this.scanBtnText.textContent = '¡Actualizado!';
      } else {
        if (this.scanBtnText) this.scanBtnText.textContent = 'Error al rastrear';
      }
    } catch (err) {
      if (this.scanBtnText) this.scanBtnText.textContent = 'Error de red';
    }

    setTimeout(() => {
      this.scanManualBtn.classList.remove('loading');
      this.scanManualBtn.disabled = false;
      if (this.scanBtnText) this.scanBtnText.textContent = 'Rastrear Ahora';
    }, 2000);
  }

  async loadDeals() {
    try {
      const res = await fetch('./data/deals.json?t=' + Date.now());
      if (!res.ok) throw new Error('No se pudo cargar data/deals.json');
      const data = await res.json();
      this.allDeals = data.deals || [];
      this.stats = data.stats || {};
      this.updateHeaderStats(data.updatedAt);
      this.render();
    } catch (err) {
      console.error('[App] Error cargando vuelos:', err);
      this.dealsContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">⚠️</div>
          <h3>No se pudieron cargar los vuelos</h3>
          <p>${err.message}</p>
        </div>
      `;
    }
  }

  updateHeaderStats(updatedAt) {
    if (updatedAt) {
      const d = new Date(updatedAt);
      this.lastUpdatedEl.textContent = `Actualizado: ${d.toLocaleDateString('es-ES')} ${d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
    }

    if (this.statTotalEl) this.statTotalEl.textContent = this.allDeals.length;
    if (this.statDaytripEl) this.statDaytripEl.textContent = this.stats.daytripsCount || 0;
    if (this.statCheapestEl) this.statCheapestEl.textContent = `${(this.stats.cheapestPrice || 0).toFixed(2)} €`;
    if (this.statMaxHoursEl) this.statMaxHoursEl.textContent = `${(this.stats.maxUsefulHours || 0).toFixed(1)} h`;
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

  getFilteredDeals() {
    return this.allDeals.filter((deal) => {
      // Filtro de modalidad
      if (this.currentMode !== 'all' && deal.mode !== this.currentMode) {
        return false;
      }

      // Filtro de precio máximo
      if (deal.totalPrice > this.currentMaxPrice) {
        return false;
      }

      // Filtro de búsqueda texto
      if (this.searchQuery) {
        const query = this.searchQuery;
        const city = (deal.destinationCity || '').toLowerCase();
        const iata = (deal.destinationIata || '').toLowerCase();
        const country = (deal.destinationCountry || '').toLowerCase();
        if (!city.includes(query) && !iata.includes(query) && !country.includes(query)) {
          return false;
        }
      }

      return true;
    });
  }

  getSortedDeals(deals) {
    return [...deals].sort((a, b) => {
      if (this.currentSort === 'date-asc') {
        const timeA = new Date(a.outbound.departureDate).getTime();
        const timeB = new Date(b.outbound.departureDate).getTime();
        if (timeA !== timeB) {
          return timeA - timeB;
        }
        return a.totalPrice - b.totalPrice;
      }
      if (this.currentSort === 'ratio') {
        return b.ratio - a.ratio;
      }
      if (this.currentSort === 'price-asc') {
        return a.totalPrice - b.totalPrice;
      }
      if (this.currentSort === 'hours-desc') {
        return b.usefulHours - a.usefulHours;
      }
      return 0;
    });
  }

  render() {
    const filtered = this.getFilteredDeals();
    const sorted = this.getSortedDeals(filtered);

    if (this.dealsCountBadge) {
      this.dealsCountBadge.textContent = `${sorted.length} encontrados`;
    }

    if (sorted.length === 0) {
      this.dealsContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">✈️</div>
          <h3>No hay chollos con los filtros actuales</h3>
          <p>Probá cambiando la modalidad o ampliando el rango de precio.</p>
        </div>
      `;
      return;
    }

    this.dealsContainer.innerHTML = sorted.map((deal) => this.renderDealCard(deal)).join('');
  }

  async sendTelegram(deal) {
    const btn = document.getElementById(`tg-btn-${deal.destinationIata}-${deal.totalPrice.toFixed(0)}`);
    if (btn) {
      btn.textContent = 'Enviando...';
      btn.disabled = true;
    }

    try {
      const params = new URLSearchParams({
        action: 'send_telegram',
        iata: deal.destinationIata,
        city: deal.destinationCity,
        price: deal.totalPrice.toFixed(2),
        hours: deal.usefulHours.toFixed(1),
        mode: deal.mode,
        airline: deal.airline || 'Ryanair',
        url: deal.bookingUrl,
      });

      const res = await fetch(`api.php?${params.toString()}`);
      const data = await res.json();
      if (data.status) {
        if (btn) btn.textContent = '✅ ¡Enviado!';
      } else {
        if (btn) btn.textContent = '❌ Error';
      }
    } catch (err) {
      if (btn) btn.textContent = '❌ Error';
    }

    setTimeout(() => {
      if (btn) {
        btn.textContent = '📲 Telegram';
        btn.disabled = false;
      }
    }, 2500);
  }

  renderDealCard(deal) {
    const flag = COUNTRY_FLAGS[deal.destinationCountry] || '✈️';
    const isDaytrip = deal.mode === 'daytrip';
    const isWeekend = deal.mode === 'weekend';

    const modeBadgeText = isDaytrip
      ? '⚡ Express Day-Trip'
      : isWeekend
      ? '🎒 Finde (1 Noche)'
      : '🌉 Escapada 2 Noches';

    const outDepTime = this.formatTime(deal.outbound.departureDate);
    const outArrTime = this.formatTime(deal.outbound.arrivalDate);
    const inDepTime = this.formatTime(deal.inbound.departureDate);
    const inArrTime = this.formatTime(deal.inbound.arrivalDate);

    const outDate = this.formatDate(deal.outbound.departureDate);
    const inDate = this.formatDate(deal.inbound.departureDate);

    const dateDisplay = isDaytrip ? outDate : `${outDate} ➔ ${inDate}`;
    const airlineName = deal.airline || 'Ryanair';
    const btnId = `tg-btn-${deal.destinationIata}-${deal.totalPrice.toFixed(0)}`;
    const isNew = Boolean(deal.isNew);

    return `
      <article class="deal-card ${isNew ? 'is-new-deal' : ''}">
        <div>
          <div class="card-top-badges">
            <span class="deal-badge ${deal.mode}">${modeBadgeText}</span>
            <div class="badge-group-right">
              ${isNew ? '<span class="deal-badge-new">✨ Nuevo</span>' : ''}
              <span class="deal-carrier-badge">✈️ ${airlineName}</span>
            </div>
          </div>

          <div class="deal-destination">
            <div class="dest-main">
              <span class="dest-flag">${flag}</span>
              <div>
                <h3 class="dest-name">${deal.destinationCity}</h3>
                <span class="dest-country">${deal.destinationCountry} • ${dateDisplay}</span>
              </div>
            </div>
            <span class="dest-iata">${deal.destinationIata}</span>
          </div>

          <div class="deal-timeline">
            <div class="leg">
              <span class="leg-type">🛫 Ida</span>
              <div class="leg-times">
                <span>${outDepTime}</span>
                <span class="leg-arrow">➔</span>
                <span>${outArrTime}</span>
              </div>
              <span class="leg-flight">${deal.outbound.flightNumber}</span>
            </div>
            <div class="leg">
              <span class="leg-type">🛬 Vuelta</span>
              <div class="leg-times">
                <span>${inDepTime}</span>
                <span class="leg-arrow">➔</span>
                <span>${inArrTime}</span>
              </div>
              <span class="leg-flight">${deal.inbound.flightNumber}</span>
            </div>
          </div>

          <div class="deal-metrics">
            <div class="metric-item">
              <span class="metric-label">Tiempo Útil</span>
              <span class="metric-val">${deal.usefulHours.toFixed(1)} horas</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">Ratio Chollo</span>
              <span class="metric-val">${deal.ratio.toFixed(2)} h/€</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">Alojamiento</span>
              <span class="metric-val ${isDaytrip ? 'hotel-zero' : ''}">${isDaytrip ? '0 € (Dormís en casa)' : deal.mode === 'weekend' ? '1 noche' : '2 noches'}</span>
            </div>
          </div>
        </div>

        <div class="deal-footer">
          <div class="deal-price-wrap">
            <span class="price-sub">Ida y Vuelta</span>
            <div class="price-amount">${deal.totalPrice.toFixed(2)}<span class="price-currency">€</span></div>
          </div>
          <div class="deal-actions">
            <button id="${btnId}" class="tg-send-btn" onclick='window.app.sendTelegram(${JSON.stringify(deal)})' title="Reenviar a mi Telegram">
              📲 Telegram
            </button>
            <a href="${deal.bookingUrl}" target="_blank" rel="noopener noreferrer" class="book-btn">
              Reservar ➔
            </a>
          </div>
        </div>
      </article>
    `;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.app = new VuelosApp();
});
