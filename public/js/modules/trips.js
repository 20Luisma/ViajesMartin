import {
  buildBoardingPassesHtml,
  buildTripHeroHtml,
  buildTripSelectorHtml,
  EMPTY_TRIP_HTML,
} from './tripsTemplates.js';

/**
 * Controlador de Mis Viajes (Hero, historial completado, cuenta regresiva, itinerario, checklist y tips)
 */
export class TripsController {
  /** @param {() => void} onTripsLoaded */
  constructor(onTripsLoaded) {
    this.onTripsLoaded = onTripsLoaded;
    /** @type {any} */
    this.tripsData = null;
    /** @type {any} */
    this.activeTrip = null;
    /** @type {ReturnType<typeof setInterval> | null} */
    this.countdownTimer = null;

    this.tripCountBadge = document.getElementById('tripCountBadge');
    this.tripHistoryBar = document.getElementById('tripHistoryBar');
    this.tripHeroSection = document.getElementById('tripHeroSection');
    this.tripBoardingPasses = document.getElementById('tripBoardingPasses');
    this.tripTimelineContainer = document.getElementById('tripTimelineContainer');
    this.tripChecklistContainer = document.getElementById('tripChecklistContainer');
    this.tripTipsContainer = document.getElementById('tripTipsContainer');
  }

  /** @param {boolean} isTripsViewActive */
  async loadTrips(isTripsViewActive) {
    try {
      const res = await fetch(`api.php?action=get_trips&t=${Date.now()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      this.tripsData = await res.json();
      const tripsList = this.tripsData.trips || [];
      if (this.tripCountBadge) this.tripCountBadge.innerText = String(tripsList.length);
      this.activeTrip = tripsList.find((/** @type {any} */ t) => t.id === this.tripsData.activeTripId) || tripsList[0] || null;
      if (isTripsViewActive) this.renderTrips();
      this.onTripsLoaded();
    } catch (err) {
      console.warn('Error cargando trips.json:', err);
    }
  }

  /** @param {any} updatedTrip */
  setActiveTrip(updatedTrip) {
    this.activeTrip = updatedTrip;
    if (this.tripsData && updatedTrip) {
      if (!Array.isArray(this.tripsData.trips)) this.tripsData.trips = [];
      const idx = this.tripsData.trips.findIndex((/** @type {any} */ t) => t.id === updatedTrip.id);
      if (idx !== -1) this.tripsData.trips[idx] = updatedTrip;
      else this.tripsData.trips.push(updatedTrip);
      this.tripsData.activeTripId = updatedTrip.id;
      if (this.tripCountBadge) this.tripCountBadge.innerText = String(this.tripsData.trips.length);
    }
    this.renderTrips();
  }

  /** @param {string} tripId */
  selectTrip(tripId) {
    const found = (this.tripsData?.trips || []).find((/** @type {any} */ t) => t.id === tripId);
    if (!found) return;
    this.activeTrip = found;
    this.tripsData.activeTripId = found.id;
    this.renderTrips();
    this.onTripsLoaded();
  }

  /** @param {string} tripId */
  toggleTripStatus(tripId) {
    const found = (this.tripsData?.trips || []).find((/** @type {any} */ t) => t.id === tripId);
    if (!found) return;
    found.status = found.status === 'completed' ? 'confirmed' : 'completed';
    if (this.activeTrip?.id === found.id) this.activeTrip = found;
    this.renderTrips();
    this.saveTripChanges();
  }

  renderTrips() {
    const subnav = /** @type {HTMLElement | null} */ (document.querySelector('.trip-subnav-container'));
    this.renderTripSelector();
    if (!this.activeTrip) {
      this.renderEmptyState(subnav);
      return;
    }
    if (subnav) subnav.style.display = 'block';
    if (this.tripHeroSection) this.tripHeroSection.innerHTML = buildTripHeroHtml(this.activeTrip);
    if (this.tripBoardingPasses) this.tripBoardingPasses.innerHTML = buildBoardingPassesHtml(this.activeTrip);
    this.renderTimeline();
    this.renderChecklist();
    this.renderSurvivalTips();
    if (this.activeTrip.status !== 'completed') {
      this.startCountdown();
    } else if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
    }
  }

  renderTripSelector() {
    if (!this.tripHistoryBar) return;
    const tripsList = this.tripsData?.trips || [];
    if (tripsList.length === 0) {
      this.tripHistoryBar.style.display = 'none';
      this.tripHistoryBar.innerHTML = '';
      return;
    }
    this.tripHistoryBar.style.display = 'flex';
    this.tripHistoryBar.innerHTML = buildTripSelectorHtml(tripsList, this.activeTrip?.id);
  }

  /** @param {HTMLElement | null} subnav */
  renderEmptyState(subnav) {
    if (this.tripHeroSection) this.tripHeroSection.innerHTML = EMPTY_TRIP_HTML;
    if (this.tripBoardingPasses) this.tripBoardingPasses.innerHTML = '';
    if (this.tripTimelineContainer) this.tripTimelineContainer.innerHTML = '';
    if (this.tripChecklistContainer) this.tripChecklistContainer.innerHTML = '';
    if (this.tripTipsContainer) this.tripTipsContainer.innerHTML = '';
    if (subnav) subnav.style.display = 'none';
    if (this.tripCountBadge) this.tripCountBadge.innerText = '0';
  }

  startCountdown() {
    if (this.countdownTimer) clearInterval(this.countdownTimer);
    if (!this.activeTrip?.flights?.outbound?.departureDate) return;

    const dep = this.activeTrip.flights.outbound;
    const targetDate = new Date(`${dep.departureDate}T${dep.departureTime || '10:30'}:00`);
    const now = new Date();
    if (targetDate.getTime() < now.getTime()) {
      targetDate.setFullYear(now.getFullYear());
      if (targetDate.getTime() < now.getTime()) targetDate.setFullYear(now.getFullYear() + 1);
    }
    const targetTime = targetDate.getTime();

    const tick = () => {
      const cdDays = document.getElementById('cdDays');
      const cdHours = document.getElementById('cdHours');
      const cdMins = document.getElementById('cdMins');
      const cdSecs = document.getElementById('cdSecs');
      if (!cdDays || !cdHours || !cdMins || !cdSecs) return;

      const diff = Math.max(0, targetTime - Date.now());
      const pad = (/** @type {number} */ n) => n.toString().padStart(2, '0');
      cdDays.innerText = pad(Math.floor(diff / 86400000));
      cdHours.innerText = pad(Math.floor((diff % 86400000) / 3600000));
      cdMins.innerText = pad(Math.floor((diff % 3600000) / 60000));
      cdSecs.innerText = pad(Math.floor((diff % 60000) / 1000));
    };

    tick();
    this.countdownTimer = setInterval(tick, 1000);
  }

  renderTimeline() {
    if (!this.tripTimelineContainer || !this.activeTrip) return;
    /** @type {Record<string, any[]>} */
    const daysMap = {};
    (this.activeTrip.timeline || []).forEach((/** @type {any} */ item) => {
      const d = item.day || 'General';
      if (!daysMap[d]) daysMap[d] = [];
      daysMap[d].push(item);
    });

    this.tripTimelineContainer.innerHTML = Object.entries(daysMap)
      .map(([day, items]) => {
        const dayDate = new Date(day);
        const dayTitle = !isNaN(dayDate.getTime())
          ? dayDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
          : day;
        const rows = items.map((it) => `
          <div class="timeline-item">
            <span class="timeline-dot"></span>
            <span class="timeline-time">${it.time}</span>
            <div class="timeline-content-card"><h4>${it.title}</h4><p>${it.desc}</p></div>
          </div>
        `).join('');
        return `<div class="timeline-day-block"><div class="timeline-day-title"><span>📅</span> <span style="text-transform: capitalize;">${dayTitle}</span></div><div class="timeline-list">${rows}</div></div>`;
      })
      .join('');
  }

  renderChecklist() {
    if (!this.tripChecklistContainer || !this.activeTrip) return;
    const checklist = this.activeTrip.checklist || [];
    const doneCount = checklist.filter((/** @type {any} */ c) => c.checked).length;

    this.tripChecklistContainer.innerHTML = `
      <div class="checklist-header">
        <h3 class="checklist-title">📋 Checklist de Salida</h3>
        <span class="checklist-progress-text">${doneCount} de ${checklist.length} listos</span>
      </div>
      <div class="checklist-items">
        ${checklist.map((/** @type {any} */ c) => `
          <div class="checklist-item-row ${c.checked ? 'checked' : ''}" onclick="window.app.toggleChecklist('${c.id}')">
            <span class="checklist-custom-checkbox">${c.checked ? '✓' : ''}</span>
            <span class="checklist-text">${c.text}</span>
          </div>
        `).join('')}
      </div>
      <div class="checklist-add-bar">
        <input type="text" id="newChecklistInput" class="checklist-input" aria-label="Añadir ítem al checklist" placeholder="Añadir ítem personalizado (ej. Llevar adaptador)...">
        <button class="checklist-add-btn" onclick="window.app.addChecklist()">+ Añadir</button>
      </div>
    `;
  }

  /** @param {string} id */
  toggleChecklist(id) {
    const item = this.activeTrip?.checklist?.find((/** @type {any} */ c) => c.id === id);
    if (!item) return;
    item.checked = !item.checked;
    this.renderChecklist();
    this.saveTripChanges();
  }

  addChecklist() {
    const input = /** @type {HTMLInputElement | null} */ (document.getElementById('newChecklistInput'));
    if (!input || !input.value.trim() || !this.activeTrip) return;
    this.activeTrip.checklist.push({ id: `c_${Date.now()}`, text: input.value.trim(), checked: false });
    this.renderChecklist();
    this.saveTripChanges();
  }

  renderSurvivalTips() {
    if (!this.tripTipsContainer || !this.activeTrip) return;
    this.tripTipsContainer.innerHTML = (this.activeTrip.survivalTips || [])
      .map((/** @type {any} */ tip) => `
        <div class="tip-box">
          <div class="tip-box-header"><span class="tip-box-icon">${tip.icon || '💡'}</span><h4 class="tip-box-title">${tip.title}</h4></div>
          <p class="tip-box-desc">${tip.desc}</p>
        </div>
      `)
      .join('');
  }

  async saveTripChanges() {
    if (!this.tripsData) return;
    try {
      await fetch('api.php?action=save_trip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.tripsData),
      });
    } catch (e) {
      console.warn('Error sincronizando trip:', e);
    }
  }
}
