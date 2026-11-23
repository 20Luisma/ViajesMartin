/**
 * Controlador de Mis Viajes (Hero, cuenta regresiva, boarding passes, itinerario, checklist y tips)
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
    if (this.tripsData?.trips && updatedTrip) {
      const idx = this.tripsData.trips.findIndex((/** @type {any} */ t) => t.id === updatedTrip.id);
      if (idx !== -1) this.tripsData.trips[idx] = updatedTrip;
    }
    this.renderTrips();
  }

  renderTrips() {
    const subnav = /** @type {HTMLElement | null} */ (document.querySelector('.trip-subnav-container'));
    if (!this.activeTrip) {
      this.renderEmptyState(subnav);
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

  /** @param {HTMLElement | null} subnav */
  renderEmptyState(subnav) {
    if (this.tripHeroSection) {
      this.tripHeroSection.innerHTML = `
        <div class="empty-state" style="padding: 50px 20px; text-align: center;">
          <div class="empty-icon" style="font-size: 3.5rem; margin-bottom: 14px;">🎒</div>
          <h2 class="empty-title" style="font-size: 1.5rem; color: #fff; margin-bottom: 10px;">Todavía no tenés ningún viaje cargado</h2>
          <p class="empty-desc" style="color: var(--text-secondary); max-width: 480px; margin: 0 auto 24px; font-size: 0.95rem; line-height: 1.5;">
            Abrí el <strong>Copiloto IA 🤖</strong> abajo a la derecha y adjuntá la captura de tu reserva o escribile tus fechas para que te arme el itinerario inteligente al instante.
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
        <span class="trip-badge-confirmed"><span class="live-dot"></span> Vuelos Confirmados</span>
      </div>
      <div class="trip-countdown-container">
        <span class="countdown-label">Cuenta Regresiva:</span>
        <div class="countdown-units">
          <div class="countdown-unit-box"><div class="countdown-val" id="cdDays">--</div><div class="countdown-sub">Días</div></div>
          <div class="countdown-unit-box"><div class="countdown-val" id="cdHours">--</div><div class="countdown-sub">Horas</div></div>
          <div class="countdown-unit-box"><div class="countdown-val" id="cdMins">--</div><div class="countdown-sub">Min</div></div>
          <div class="countdown-unit-box"><div class="countdown-val" id="cdSecs">--</div><div class="countdown-sub">Seg</div></div>
        </div>
      </div>
    `;
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

  /** @param {any} leg @param {string} cssClass @param {string} label */
  renderBoardingCard(leg, cssClass, label) {
    return `
      <div class="boarding-pass-card">
        <div class="boarding-card-header">
          <span class="boarding-tag ${cssClass}">${label}</span>
          <span class="boarding-flight-num">${leg.airline} ${leg.flightNumber}</span>
        </div>
        <div class="boarding-route">
          <div class="boarding-point"><div class="iata">${leg.originIata}</div><div class="time">${leg.departureTime}</div><div class="city">${leg.originName}</div></div>
          <span class="boarding-arrow">✈️ ➔</span>
          <div class="boarding-point right"><div class="iata">${leg.destinationIata}</div><div class="time">${leg.arrivalTime}</div><div class="city">${leg.destinationName}</div></div>
        </div>
        <div class="boarding-footer">
          <span class="boarding-footer-date" title="${leg.departureDate} • ${leg.terminal || 'T2'}">📅 ${leg.departureDate} • ${leg.terminal || 'T2'}</span>
          <span class="boarding-tag-luggage">🎒 Mochila 40x20x25cm</span>
        </div>
      </div>
    `;
  }

  renderBoardingPasses() {
    if (!this.tripBoardingPasses || !this.activeTrip) return;
    const { outbound, inbound } = this.activeTrip.flights;
    const hotel = this.activeTrip.hotel || {};

    this.tripBoardingPasses.innerHTML = `
      ${this.renderBoardingCard(outbound, 'outbound', '🛫 Vuelo de Ida')}
      ${this.renderBoardingCard(inbound, 'inbound', '🛬 Vuelo de Vuelta')}
      <div class="hotel-card">
        <div class="hotel-header">
          <span class="hotel-icon">🏨</span>
          <div>
            <div class="hotel-name">${hotel.name || 'Alojamiento'}</div>
            <div class="hotel-address">${hotel.address || 'Ubicación céntrica'}</div>
          </div>
        </div>
        <div class="hotel-meta-row">
          <span>🕒 Check-in: <strong>${hotel.checkIn || '12:00 - 13:00'}</strong></span>
          <span>🕒 Check-out: <strong>${hotel.checkOut || '11:00'}</strong></span>
          ${hotel.confirmationNumber ? `<span>📋 Booking: <strong>#${hotel.confirmationNumber}</strong></span>` : ''}
          ${hotel.phone ? `<span>📞 Tel: <strong>${hotel.phone}</strong></span>` : ''}
        </div>
        <p style="margin-top: 10px; font-size: 0.85rem; color: var(--text-muted); line-height: 1.4;">
          💡 <strong>Nota del Copiloto:</strong> ${hotel.notes || 'Avisar llegada para transfer.'}
        </p>
      </div>
    `;
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
