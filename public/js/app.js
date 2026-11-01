/**
 * Vuelos Martín - Frontend Application Logic v4.0
 * Radar de Chollos + Mis Viajes (Itinerario & Checklist) + Copiloto IA Multimodal
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

    // Mis Viajes & Copiloto State
    this.currentView = 'radar'; // 'radar' | 'trips'
    this.currentSubtab = 'itinerary'; // 'itinerary' | 'checklist' | 'tips'
    this.tripsData = null;
    this.activeTrip = null;
    this.countdownTimer = null;
    this.attachedFile = null; // { data: base64, mimeType, name }

    this.initElements();
    this.bindEvents();
    this.setupPwa();
    this.loadDeals();
    this.loadTrips();
  }

  initElements() {
    // Views
    this.radarView = document.getElementById('radarView');
    this.tripsView = document.getElementById('tripsView');
    this.navRadarBtn = document.getElementById('navRadarBtn');
    this.navTripsBtn = document.getElementById('navTripsBtn');
    this.tripCountBadge = document.getElementById('tripCountBadge');

    // Radar Elements
    this.dealsContainer = document.getElementById('dealsContainer');
    this.dealsCountBadge = document.getElementById('dealsCountBadge');
    this.lastUpdatedEl = document.getElementById('lastUpdated');
    this.statTotalEl = document.getElementById('statTotal');
    this.statDaytripEl = document.getElementById('statDaytrip');
    this.statCheapestEl = document.getElementById('statCheapest');
    this.statMaxHoursEl = document.getElementById('statMaxHours');
    this.searchInput = document.getElementById('searchInput');
    this.sortSelect = document.getElementById('sortSelect');
    this.tabButtons = document.querySelectorAll('.tab-btn');
    this.priceChips = document.querySelectorAll('.price-chip');
    this.scanManualBtn = document.getElementById('scanManualBtn');
    this.scanBtnText = document.getElementById('scanBtnText');
    this.installAppBtn = document.getElementById('installAppBtn');

    // Mis Viajes Elements
    this.tripHeroSection = document.getElementById('tripHeroSection');
    this.tripBoardingPasses = document.getElementById('tripBoardingPasses');
    this.tripSubnavPills = document.querySelectorAll('.trip-subnav-pill');
    this.tripSubItinerary = document.getElementById('tripSubItinerary');
    this.tripSubChecklist = document.getElementById('tripSubChecklist');
    this.tripSubTips = document.getElementById('tripSubTips');
    this.tripTimelineContainer = document.getElementById('tripTimelineContainer');
    this.tripChecklistContainer = document.getElementById('tripChecklistContainer');
    this.tripTipsContainer = document.getElementById('tripTipsContainer');

    // Copiloto IA Elements
    this.openCopilotBtn = document.getElementById('openCopilotBtn');
    this.copilotDrawerOverlay = document.getElementById('copilotDrawerOverlay');
    this.closeCopilotBtn = document.getElementById('closeCopilotBtn');
    this.copilotMessages = document.getElementById('copilotMessages');
    this.copilotForm = document.getElementById('copilotForm');
    this.copilotInput = document.getElementById('copilotInput');
    this.copilotFileInput = document.getElementById('copilotFileInput');
    this.copilotAttachBtn = document.getElementById('copilotAttachBtn');
    this.copilotFilePreview = document.getElementById('copilotFilePreview');
    this.filePreviewName = document.getElementById('filePreviewName');
    this.removeFileBtn = document.getElementById('removeFileBtn');
    this.copilotSendBtn = document.getElementById('copilotSendBtn');
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
    // Navigation Switcher (Radar vs Mis Viajes)
    if (this.navRadarBtn) {
      this.navRadarBtn.addEventListener('click', () => this.switchView('radar'));
    }
    if (this.navTripsBtn) {
      this.navTripsBtn.addEventListener('click', () => this.switchView('trips'));
    }

    // Manual scan button
    if (this.scanManualBtn) {
      this.scanManualBtn.addEventListener('click', () => this.triggerManualScan());
    }

    // Mode tabs
    this.tabButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
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
    if (this.searchInput) {
      this.searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.trim().toLowerCase();
        this.render();
      });
    }

    // Sort select
    if (this.sortSelect) {
      this.sortSelect.addEventListener('change', (e) => {
        this.currentSort = e.target.value;
        this.render();
      });
    }

    // Mis Viajes Subnav Pills (Itinerario, Checklist, Tips)
    this.tripSubnavPills.forEach((pill) => {
      pill.addEventListener('click', () => {
        this.tripSubnavPills.forEach((p) => p.classList.remove('active'));
        pill.classList.add('active');
        this.switchTripSubtab(pill.dataset.subtab);
      });
    });

    // Copiloto Drawer Controls
    if (this.openCopilotBtn) {
      this.openCopilotBtn.addEventListener('click', () => this.openCopilot());
    }
    if (this.closeCopilotBtn) {
      this.closeCopilotBtn.addEventListener('click', () => this.closeCopilot());
    }
    if (this.copilotDrawerOverlay) {
      this.copilotDrawerOverlay.addEventListener('click', (e) => {
        if (e.target === this.copilotDrawerOverlay) this.closeCopilot();
      });
    }

    // Copiloto File Attachment
    if (this.copilotAttachBtn && this.copilotFileInput) {
      this.copilotAttachBtn.addEventListener('click', () => this.copilotFileInput.click());
      this.copilotFileInput.addEventListener('change', (e) => this.handleFileAttach(e));
    }
    if (this.removeFileBtn) {
      this.removeFileBtn.addEventListener('click', () => this.clearAttachedFile());
    }

    // Copiloto Submit Form
    if (this.copilotForm) {
      this.copilotForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.submitCopilotMessage();
      });
    }
  }

  // ==============================================================================
  // VISTA NAVIGATION
  // ==============================================================================
  switchView(viewName) {
    this.currentView = viewName;
    if (viewName === 'radar') {
      this.navRadarBtn.classList.add('active');
      this.navTripsBtn.classList.remove('active');
      this.radarView.style.display = 'block';
      this.tripsView.style.display = 'none';
      if (this.openCopilotBtn) this.openCopilotBtn.style.display = 'none';
    } else {
      this.navRadarBtn.classList.remove('active');
      this.navTripsBtn.classList.add('active');
      this.radarView.style.display = 'none';
      this.tripsView.style.display = 'block';
      if (this.openCopilotBtn) this.openCopilotBtn.style.display = 'flex';
      this.renderTrips();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  switchTripSubtab(subtab) {
    this.currentSubtab = subtab;
    this.tripSubItinerary.style.display = subtab === 'itinerary' ? 'block' : 'none';
    this.tripSubChecklist.style.display = subtab === 'checklist' ? 'block' : 'none';
    this.tripSubTips.style.display = subtab === 'tips' ? 'block' : 'none';
  }

  // ==============================================================================
  // RADAR DE CHOLLOS - DATOS & RENDER
  // ==============================================================================
  async loadDeals() {
    try {
      const res = await fetch(`data/deals.json?t=${Date.now()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      this.allDeals = data.deals || [];
      this.stats = data.stats || {};
      this.render();
      this.updateLastUpdated(data.updatedAt);
    } catch (err) {
      console.warn('Cargando con fallback api.php:', err);
      try {
        const resApi = await fetch('api.php');
        const dataApi = await resApi.json();
        this.allDeals = dataApi.deals || [];
        this.stats = dataApi.stats || {};
        this.render();
        this.updateLastUpdated(dataApi.updatedAt);
      } catch (e) {
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

  async triggerManualScan() {
    if (!this.scanManualBtn || this.scanManualBtn.disabled) return;
    this.scanManualBtn.disabled = true;
    this.scanBtnText.innerText = 'Rastreando...';
    this.scanManualBtn.classList.add('scanning');

    try {
      const res = await fetch('api.php?action=scan');
      const data = await res.json();
      if (data.status) {
        this.showToast(`✨ ${data.message} (${data.totalDeals} vuelos aprobados)`);
        await this.loadDeals();
      } else {
        this.showToast('⚠️ Hubo un detalle en el rastreo en vivo.');
      }
    } catch (err) {
      this.showToast('❌ Error de conexión al rastrear.');
    } finally {
      this.scanManualBtn.disabled = false;
      this.scanBtnText.innerText = 'Rastrear Ahora';
      this.scanManualBtn.classList.remove('scanning');
    }
  }

  updateLastUpdated(isoString) {
    if (!this.lastUpdatedEl || !isoString) return;
    const date = new Date(isoString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const mins = date.getMinutes().toString().padStart(2, '0');
    this.lastUpdatedEl.innerHTML = `<span class="live-dot"></span> Actualizado: ${day}/${month} ${hours}:${mins}`;
  }

  render() {
    if (!this.dealsContainer) return;

    let filtered = this.allDeals.filter((deal) => {
      if (this.currentMode !== 'all' && deal.mode !== this.currentMode) return false;
      if (deal.totalPrice > this.currentMaxPrice) return false;
      if (this.searchQuery) {
        const query = this.searchQuery;
        const city = (deal.destinationCity || '').toLowerCase();
        const country = (deal.destinationCountry || '').toLowerCase();
        const iata = (deal.destinationIata || '').toLowerCase();
        const airline = (deal.airline || '').toLowerCase();
        if (!city.includes(query) && !country.includes(query) && !iata.includes(query) && !airline.includes(query)) {
          return false;
        }
      }
      return true;
    });

    filtered.sort((a, b) => {
      if (this.currentSort === 'date-asc') {
        const dateA = new Date(a.outbound.departureDate).getTime();
        const dateB = new Date(b.outbound.departureDate).getTime();
        return dateA - dateB;
      }
      if (this.currentSort === 'price-asc') return a.totalPrice - b.totalPrice;
      if (this.currentSort === 'hours-desc') return b.usefulHours - a.usefulHours;
      return b.ratio - a.ratio;
    });

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

  renderStats(filtered) {
    if (this.statTotalEl) this.statTotalEl.innerText = this.allDeals.length;
    const daytripsCount = this.allDeals.filter((d) => d.mode === 'daytrip').length;
    if (this.statDaytripEl) this.statDaytripEl.innerText = daytripsCount;

    if (filtered.length > 0) {
      const minPrice = Math.min(...filtered.map((d) => d.totalPrice));
      const maxHours = Math.max(...filtered.map((d) => d.usefulHours));
      if (this.statCheapestEl) this.statCheapestEl.innerText = `${minPrice.toFixed(0)} €`;
      if (this.statMaxHoursEl) this.statMaxHoursEl.innerText = `${maxHours.toFixed(1)} h`;
    } else {
      if (this.statCheapestEl) this.statCheapestEl.innerText = '--';
      if (this.statMaxHoursEl) this.statMaxHoursEl.innerText = '--';
    }
  }

  renderDealCard(deal) {
    const flag = COUNTRY_FLAGS[deal.destinationCountry] || '✈️';
    const isDaytrip = deal.mode === 'daytrip';
    const isWeekend = deal.mode === 'weekend';
    const modeBadgeClass = isDaytrip ? 'badge-daytrip' : isWeekend ? 'badge-weekend' : 'badge-bridge';
    const modeText = isDaytrip ? '⚡ Express Day-Trip' : isWeekend ? '🎒 Finde (1 Noche)' : '🌉 Escapada 2 Noches';

    const outDateObj = new Date(deal.outbound.departureDate);
    const inDateObj = new Date(deal.inbound.departureDate);
    const dateFormatted = outDateObj.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
    const outDepTime = outDateObj.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    const outArrTime = new Date(deal.outbound.arrivalDate).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    const inDepTime = inDateObj.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    const inArrTime = new Date(deal.inbound.arrivalDate).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

    const btnId = `tg_btn_${deal.destinationIata}_${deal.mode}_${Math.round(deal.totalPrice)}`;
    const newBadgeHtml = deal.isNew ? '<span class="badge-new-deal" title="Chollo cazado recientemente">✨ Nuevo</span>' : '';

    return `
      <article class="deal-card ${isDaytrip ? 'is-daytrip' : ''}">
        <div class="deal-header">
          <div class="deal-badge-row">
            <span class="mode-badge ${modeBadgeClass}">${modeText}</span>
            <div class="badge-group-right">
              ${newBadgeHtml}
              <span class="airline-tag">${deal.airline || 'Aerolínea'}</span>
            </div>
          </div>
          <span class="deal-date">${dateFormatted}</span>
        </div>

        <div class="deal-body">
          <div class="deal-route">
            <div class="dest-info">
              <span class="dest-flag">${flag}</span>
              <div>
                <h3 class="dest-city">${deal.destinationCity}</h3>
                <span class="dest-country">${deal.destinationCountry}</span>
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

  async sendTelegram(deal) {
    const btnId = `tg_btn_${deal.destinationIata}_${deal.mode}_${Math.round(deal.totalPrice)}`;
    const btn = document.getElementById(btnId);
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
        this.showToast(`✈️ ¡Enviado a tu Telegram! BCN ➔ ${deal.destinationCity}`);
        if (btn) btn.innerText = '✅ Enviado';
      } else {
        this.showToast('⚠️ No se pudo enviar a Telegram.');
        if (btn) btn.innerText = '📲 Telegram';
      }
    } catch (err) {
      this.showToast('❌ Error de conexión al enviar.');
      if (btn) btn.innerText = '📲 Telegram';
    } finally {
      if (btn) setTimeout(() => (btn.disabled = false), 2000);
    }
  }

  // ==============================================================================
  // MIS VIAJES (ITINERARIO, CHECKLIST, TIPS)
  // ==============================================================================
  async loadTrips() {
    try {
      const res = await fetch(`api.php?action=get_trips&t=${Date.now()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      this.tripsData = await res.json();
      const tripsList = this.tripsData.trips || [];
      if (this.tripCountBadge) {
        this.tripCountBadge.innerText = tripsList.length;
      }
      this.activeTrip = tripsList.find((t) => t.id === this.tripsData.activeTripId) || tripsList[0] || null;
      if (this.currentView === 'trips') {
        this.renderTrips();
      }
    } catch (err) {
      console.warn('Error cargando trips.json:', err);
    }
  }

  renderTrips() {
    const subnav = document.querySelector('.trip-subnav-container');
    if (!this.activeTrip) {
      if (this.tripHeroSection) {
        this.tripHeroSection.innerHTML = `
          <div class="empty-state" style="padding: 50px 20px; text-align: center;">
            <div class="empty-icon" style="font-size: 3.5rem; margin-bottom: 14px;">🎒</div>
            <h3 class="empty-title" style="font-size: 1.5rem; color: #fff; margin-bottom: 10px;">Todavía no tenés ningún viaje cargado</h3>
            <p class="empty-desc" style="color: var(--text-secondary); max-width: 480px; margin: 0 auto 24px; font-size: 0.95rem; line-height: 1.5;">
              Abrí el <strong>Copiloto IA 🤖</strong> abajo a la derecha y adjuntá la captura de tu reserva (Ryanair, Vueling, etc.) o escribile tus fechas para que te arme el itinerario inteligente al instante.
            </p>
            <button class="scan-now-btn" onclick="window.app.openCopilot()" style="margin: 0 auto; display: inline-flex; font-size: 0.95rem; padding: 12px 24px;">
              <span class="btn-icon">📸</span> <span>Cargar mi primer viaje</span>
            </button>
          </div>
        `;
      }
      if (this.tripBoardingPasses) this.tripBoardingPasses.innerHTML = '';
      if (this.tripTimelineContainer) this.tripTimelineContainer.innerHTML = '';
      if (this.tripChecklistContainer) this.tripChecklistContainer.innerHTML = '';
      if (this.tripTipsContainer) this.tripTipsContainer.innerHTML = '';
      if (subnav) subnav.style.display = 'none';
      if (this.tripCountBadge) this.tripCountBadge.innerText = '0';
      return;
    }
    if (subnav) subnav.style.display = 'block';
    this.renderTripHero();
    this.renderBoardingPasses();
    this.renderTimeline();
    this.renderChecklist();
    this.renderSurvivalTips();
    this.startCountdown();
  }

  renderTripHero() {
    if (!this.tripHeroSection || !this.activeTrip) return;
    const t = this.activeTrip;

    this.tripHeroSection.innerHTML = `
      <div class="trip-hero-header">
        <div class="trip-hero-destination">
          <span class="trip-hero-flag">${t.flag || '✈️'}</span>
          <div>
            <h2 class="trip-hero-title">${t.title || 'Mi Viaje'}</h2>
            <div class="trip-hero-subtitle">
              <span>${t.destinationCity}, ${t.destinationCountry}</span> • 
              <span>${t.dates.outbound} al ${t.dates.inbound}</span> • 
              <span>${t.usefulHours || 32} horas útiles</span>
            </div>
          </div>
        </div>
        <span class="trip-badge-confirmed">
          <span class="live-dot"></span> Vuelos Confirmados
        </span>
      </div>

      <div class="trip-countdown-container">
        <span class="countdown-label">Cuenta Regresiva:</span>
        <div class="countdown-units">
          <div class="countdown-unit-box">
            <div class="countdown-val" id="cdDays">--</div>
            <div class="countdown-sub">Días</div>
          </div>
          <div class="countdown-unit-box">
            <div class="countdown-val" id="cdHours">--</div>
            <div class="countdown-sub">Horas</div>
          </div>
          <div class="countdown-unit-box">
            <div class="countdown-val" id="cdMins">--</div>
            <div class="countdown-sub">Min</div>
          </div>
          <div class="countdown-unit-box">
            <div class="countdown-val" id="cdSecs">--</div>
            <div class="countdown-sub">Seg</div>
          </div>
        </div>
      </div>
    `;
  }

  startCountdown() {
    if (this.countdownTimer) clearInterval(this.countdownTimer);
    if (!this.activeTrip || !this.activeTrip.flights?.outbound?.departureDate) return;

    let depDateStr = `${this.activeTrip.flights.outbound.departureDate}T${this.activeTrip.flights.outbound.departureTime || '10:30'}:00`;
    let targetDate = new Date(depDateStr);
    const now = new Date();

    // Auto-ajuste de año si la fecha parseada quedó en el pasado
    if (targetDate.getTime() < now.getTime()) {
      targetDate.setFullYear(now.getFullYear());
      if (targetDate.getTime() < now.getTime()) {
        targetDate.setFullYear(now.getFullYear() + 1);
      }
    }
    const targetTime = targetDate.getTime();

    const tick = () => {
      const nowMs = Date.now();
      const diff = targetTime - nowMs;

      const cdDays = document.getElementById('cdDays');
      const cdHours = document.getElementById('cdHours');
      const cdMins = document.getElementById('cdMins');
      const cdSecs = document.getElementById('cdSecs');

      if (!cdDays) return;

      if (diff <= 0) {
        cdDays.innerText = '00';
        cdHours.innerText = '00';
        cdMins.innerText = '00';
        cdSecs.innerText = '00';
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);

      cdDays.innerText = days.toString().padStart(2, '0');
      cdHours.innerText = hours.toString().padStart(2, '0');
      cdMins.innerText = mins.toString().padStart(2, '0');
      cdSecs.innerText = secs.toString().padStart(2, '0');
    };

    tick();
    this.countdownTimer = setInterval(tick, 1000);
  }

  renderBoardingPasses() {
    if (!this.tripBoardingPasses || !this.activeTrip) return;
    const t = this.activeTrip;
    const outb = t.flights.outbound;
    const inb = t.flights.inbound;
    const hotel = t.hotel || {};

    this.tripBoardingPasses.innerHTML = `
      <!-- Tarjeta Ida -->
      <div class="boarding-pass-card">
        <div class="boarding-card-header">
          <span class="boarding-tag outbound">🛫 Vuelo de Ida</span>
          <span class="boarding-flight-num">${outb.airline} ${outb.flightNumber}</span>
        </div>
        <div class="boarding-route">
          <div class="boarding-point">
            <div class="iata">${outb.originIata}</div>
            <div class="time">${outb.departureTime}</div>
            <div class="city">${outb.originName}</div>
          </div>
          <span class="boarding-arrow">✈️ ➔</span>
          <div class="boarding-point right">
            <div class="iata">${outb.destinationIata}</div>
            <div class="time">${outb.arrivalTime}</div>
            <div class="city">${outb.destinationName}</div>
          </div>
        </div>
        <div class="boarding-footer">
          <span class="boarding-footer-date" title="${outb.departureDate} • ${outb.terminal || 'T2'}">📅 ${outb.departureDate} • ${outb.terminal || 'T2'}</span>
          <span class="boarding-tag-luggage">🎒 Mochila 40x20x25cm</span>
        </div>
      </div>

      <!-- Tarjeta Vuelta -->
      <div class="boarding-pass-card">
        <div class="boarding-card-header">
          <span class="boarding-tag inbound">🛬 Vuelo de Vuelta</span>
          <span class="boarding-flight-num">${inb.airline} ${inb.flightNumber}</span>
        </div>
        <div class="boarding-route">
          <div class="boarding-point">
            <div class="iata">${inb.originIata}</div>
            <div class="time">${inb.departureTime}</div>
            <div class="city">${inb.originName}</div>
          </div>
          <span class="boarding-arrow">✈️ ➔</span>
          <div class="boarding-point right">
            <div class="iata">${inb.destinationIata}</div>
            <div class="time">${inb.arrivalTime}</div>
            <div class="city">${inb.destinationName}</div>
          </div>
        </div>
        <div class="boarding-footer">
          <span class="boarding-footer-date" title="${inb.departureDate} • ${inb.terminal || 'T2'}">📅 ${inb.departureDate} • ${inb.terminal || 'T2'}</span>
          <span class="boarding-tag-luggage">🎒 Mochila 40x20x25cm</span>
        </div>
      </div>

      <!-- Tarjeta Alojamiento -->
      <div class="hotel-card">
        <div class="hotel-header">
          <span class="hotel-icon">🏨</span>
          <div>
            <div class="hotel-name">${hotel.name || 'Alojamiento'}</div>
            <div class="hotel-address">${hotel.address || 'Ubicación céntrica'}</div>
          </div>
        </div>
        <div class="hotel-meta-row">
          <span>🕒 Check-in: <strong>${hotel.checkIn || '13:00'}</strong></span>
          <span>🕒 Check-out: <strong>${hotel.checkOut || '11:00'}</strong></span>
          <span>💶 Precio: <strong>${hotel.price || '35 €'}</strong></span>
        </div>
        <p style="margin-top: 10px; font-size: 0.85rem; color: var(--text-muted); line-height: 1.4;">
          💡 <strong>Nota del Copiloto:</strong> ${hotel.notes || 'Avisar llegada al Riad para transfer.'}
        </p>
      </div>
    `;
  }

  renderTimeline() {
    if (!this.tripTimelineContainer || !this.activeTrip) return;
    const timeline = this.activeTrip.timeline || [];

    // Agrupar por día
    const daysMap = {};
    timeline.forEach((item) => {
      const d = item.day || 'General';
      if (!daysMap[d]) daysMap[d] = [];
      daysMap[d].push(item);
    });

    let html = '';
    for (const [day, items] of Object.entries(daysMap)) {
      const dayDate = new Date(day);
      const dayTitle = !isNaN(dayDate.getTime())
        ? dayDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
        : day;

      html += `
        <div class="timeline-day-block">
          <div class="timeline-day-title">
            <span>📅</span> <span style="text-transform: capitalize;">${dayTitle}</span>
          </div>
          <div class="timeline-list">
            ${items
              .map(
                (it) => `
              <div class="timeline-item">
                <span class="timeline-dot"></span>
                <span class="timeline-time">${it.time}</span>
                <div class="timeline-content-card">
                  <h4>${it.title}</h4>
                  <p>${it.desc}</p>
                </div>
              </div>
            `
              )
              .join('')}
          </div>
        </div>
      `;
    }

    this.tripTimelineContainer.innerHTML = html;
  }

  renderChecklist() {
    if (!this.tripChecklistContainer || !this.activeTrip) return;
    const checklist = this.activeTrip.checklist || [];
    const doneCount = checklist.filter((c) => c.checked).length;

    this.tripChecklistContainer.innerHTML = `
      <div class="checklist-header">
        <h3 class="checklist-title">📋 Checklist de Salida</h3>
        <span class="checklist-progress-text">${doneCount} de ${checklist.length} listos</span>
      </div>

      <div class="checklist-items">
        ${checklist
          .map(
            (c) => `
          <div class="checklist-item-row ${c.checked ? 'checked' : ''}" onclick="window.app.toggleChecklist('${c.id}')">
            <span class="checklist-custom-checkbox">${c.checked ? '✓' : ''}</span>
            <span class="checklist-text">${c.text}</span>
          </div>
        `
          )
          .join('')}
      </div>

      <div class="checklist-add-bar">
        <input type="text" id="newChecklistInput" class="checklist-input" placeholder="Añadir ítem personalizado (ej. Llevar adaptador)...">
        <button class="checklist-add-btn" onclick="window.app.addChecklist()">+ Añadir</button>
      </div>
    `;
  }

  toggleChecklist(id) {
    if (!this.activeTrip || !this.activeTrip.checklist) return;
    const item = this.activeTrip.checklist.find((c) => c.id === id);
    if (item) {
      item.checked = !item.checked;
      this.renderChecklist();
      this.saveTripChanges();
    }
  }

  addChecklist() {
    const input = document.getElementById('newChecklistInput');
    if (!input || !input.value.trim() || !this.activeTrip) return;
    const newItem = {
      id: `c_${Date.now()}`,
      text: input.value.trim(),
      checked: false,
    };
    this.activeTrip.checklist.push(newItem);
    this.renderChecklist();
    this.saveTripChanges();
  }

  renderSurvivalTips() {
    if (!this.tripTipsContainer || !this.activeTrip) return;
    const tips = this.activeTrip.survivalTips || [];

    this.tripTipsContainer.innerHTML = tips
      .map(
        (tip) => `
      <div class="tip-box">
        <div class="tip-box-header">
          <span class="tip-box-icon">${tip.icon || '💡'}</span>
          <h4 class="tip-box-title">${tip.title}</h4>
        </div>
        <p class="tip-box-desc">${tip.desc}</p>
      </div>
    `
      )
      .join('');
  }

  async saveTripChanges() {
    try {
      if (!this.tripsData) return;
      await fetch('api.php?action=save_trip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.tripsData),
      });
    } catch (e) {
      console.warn('Error sincronizando trip:', e);
    }
  }

  // ==============================================================================
  // COPILOTO IA CONTEXTUAL & MULTIMODAL
  // ==============================================================================
  openCopilot() {
    if (this.copilotDrawerOverlay) {
      this.copilotDrawerOverlay.classList.add('open');
      if (this.copilotInput) this.copilotInput.focus();
    }
  }

  closeCopilot() {
    if (this.copilotDrawerOverlay) {
      this.copilotDrawerOverlay.classList.remove('open');
    }
  }

  handleFileAttach(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64Data = reader.result.split(',')[1];
      this.attachedFile = {
        data: base64Data,
        mimeType: file.type || 'image/jpeg',
        name: file.name,
      };
      if (this.filePreviewName) this.filePreviewName.innerText = file.name;
      if (this.copilotFilePreview) this.copilotFilePreview.style.display = 'flex';
      this.showToast(`📎 Archivo cargado: ${file.name}`);
    };
    reader.readAsDataURL(file);
  }

  clearAttachedFile() {
    this.attachedFile = null;
    if (this.copilotFileInput) this.copilotFileInput.value = '';
    if (this.copilotFilePreview) this.copilotFilePreview.style.display = 'none';
  }

  async submitCopilotMessage() {
    const text = this.copilotInput.value.trim();
    if (!text && !this.attachedFile) return;

    const userMessage = text;
    const fileToSend = this.attachedFile ? { ...this.attachedFile } : null;

    // Agregar mensaje del usuario a la UI
    this.appendMessage('user', userMessage || `[Archivo adjunto: ${fileToSend.name}]`);
    this.copilotInput.value = '';
    this.clearAttachedFile();

    // Estado pensando
    this.copilotSendBtn.disabled = true;
    const loadingId = this.appendLoadingMessage();

    try {
      const payload = {
        message: userMessage,
        trip: this.activeTrip,
        file: fileToSend,
      };

      const res = await fetch('api.php?action=trip_copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      this.removeLoadingMessage(loadingId);

      if (data.status && data.reply) {
        this.appendMessage('bot', data.reply);
        if (data.updatedTrip) {
          this.activeTrip = data.updatedTrip;
          // Actualizar en memoria general
          if (this.tripsData && this.tripsData.trips) {
            const idx = this.tripsData.trips.findIndex((t) => t.id === this.activeTrip.id);
            if (idx !== -1) this.tripsData.trips[idx] = this.activeTrip;
          }
          this.renderTrips();
          this.showToast('✨ Itinerario actualizado por el Copiloto IA');
        }
      } else {
        this.appendMessage('bot', `⚠️ Hubo un detalle: ${data.message || 'No pude procesar la consulta.'}`);
      }
    } catch (err) {
      this.removeLoadingMessage(loadingId);
      this.appendMessage('bot', '❌ Error de conexión al consultar con el Copiloto.');
    } finally {
      this.copilotSendBtn.disabled = false;
    }
  }

  appendMessage(sender, text) {
    if (!this.copilotMessages) return;
    const msgDiv = document.createElement('div');
    msgDiv.className = `copilot-msg ${sender}`;
    msgDiv.innerHTML = `
      <span class="msg-avatar">${sender === 'user' ? '👤' : '🤖'}</span>
      <div class="msg-bubble">${text.replace(/\n/g, '<br>')}</div>
    `;
    this.copilotMessages.appendChild(msgDiv);
    this.copilotMessages.scrollTop = this.copilotMessages.scrollHeight;
  }

  appendLoadingMessage() {
    if (!this.copilotMessages) return null;
    const id = `loading_${Date.now()}`;
    const msgDiv = document.createElement('div');
    msgDiv.id = id;
    msgDiv.className = 'copilot-msg bot';
    msgDiv.innerHTML = `
      <span class="msg-avatar">🤖</span>
      <div class="msg-bubble" style="color: var(--accent-cyan); font-style: italic;">
        Pensando y ajustando itinerario...
      </div>
    `;
    this.copilotMessages.appendChild(msgDiv);
    this.copilotMessages.scrollTop = this.copilotMessages.scrollHeight;
    return id;
  }

  removeLoadingMessage(id) {
    if (!id) return;
    const el = document.getElementById(id);
    if (el) el.remove();
  }

  showToast(message) {
    let toast = document.getElementById('appToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'appToast';
      toast.style.cssText = `
        position: fixed;
        bottom: 30px;
        left: 50%;
        transform: translateX(-50%) translateY(100px);
        background: rgba(15, 23, 42, 0.95);
        border: 1px solid var(--border-highlight);
        color: #fff;
        padding: 12px 24px;
        border-radius: 30px;
        font-size: 0.9rem;
        font-weight: 600;
        z-index: 9999;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
        transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease;
        opacity: 0;
        pointer-events: none;
      `;
      document.body.appendChild(toast);
    }
    toast.innerText = message;
    toast.style.transform = 'translateX(-50%) translateY(0)';
    toast.style.opacity = '1';

    clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      toast.style.transform = 'translateX(-50%) translateY(100px)';
      toast.style.opacity = '0';
    }, 3500);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.app = new VuelosApp();
});
