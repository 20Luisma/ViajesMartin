/**
 * Plantillas HTML puras para la vista de Mis Viajes e Historial
 */

/** @param {any} t @param {string | undefined} activeId */
function renderHistoryPill(t, activeId) {
  const isSelected = activeId === t.id;
  const isDone = t.status === 'completed';
  return `
    <button type="button" class="trip-history-pill ${isSelected ? 'active' : ''} ${isDone ? 'completed' : ''}" onclick="window.app.selectTrip('${t.id}')">
      <span>${t.flag || '✈️'}</span>
      <span>${t.destinationCity || t.title}</span>
      <span class="trip-pill-date">${t.dates?.outbound || ''}</span>
      ${isDone ? '<span class="trip-pill-done">✓</span>' : ''}
    </button>
  `;
}

/** @param {any[]} tripsList @param {string | undefined} activeId */
export function buildTripSelectorHtml(tripsList, activeId) {
  const activeList = tripsList.filter((t) => t.status !== 'completed');
  const historyList = tripsList.filter((t) => t.status === 'completed');
  const activeGroup = activeList.length > 0
    ? `<div class="trip-history-group"><span class="trip-history-label">✈️ Activos (${activeList.length})</span><div class="trip-history-pills">${activeList.map((t) => renderHistoryPill(t, activeId)).join('')}</div></div>`
    : '';
  const historyGroup = historyList.length > 0
    ? `<div class="trip-history-group"><span class="trip-history-label">🏆 Historial (${historyList.length})</span><div class="trip-history-pills">${historyList.map((t) => renderHistoryPill(t, activeId)).join('')}</div></div>`
    : '';
  return `<div class="trip-history-groups">${activeGroup}${historyGroup}</div>`;
}

/** @param {any} t */
export function buildTripHeroHtml(t) {
  const isCompleted = t.status === 'completed';
  const badgeHtml = isCompleted
    ? '<span class="trip-badge-completed">✅ Viaje Completado</span>'
    : '<span class="trip-badge-confirmed"><span class="live-dot"></span> Vuelos Confirmados</span>';
  const footerHtml = isCompleted
    ? '<div class="trip-completed-banner">🏁 <span>Escapada completada y guardada en tu <strong>Historial de Viajes</strong>. Abrí el Copiloto IA y tocá <strong>✨ Nuevo Viaje</strong> cuando quieras cargar el próximo destino.</span></div>'
    : `<div class="trip-countdown-container">
        <span class="countdown-label">Cuenta Regresiva:</span>
        <div class="countdown-units">
          <div class="countdown-unit-box"><div class="countdown-val" id="cdDays">--</div><div class="countdown-sub">Días</div></div>
          <div class="countdown-unit-box"><div class="countdown-val" id="cdHours">--</div><div class="countdown-sub">Horas</div></div>
          <div class="countdown-unit-box"><div class="countdown-val" id="cdMins">--</div><div class="countdown-sub">Min</div></div>
          <div class="countdown-unit-box"><div class="countdown-val" id="cdSecs">--</div><div class="countdown-sub">Seg</div></div>
        </div>
      </div>`;

  return `
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
      <div class="trip-hero-badges">
        ${badgeHtml}
        <button type="button" class="trip-status-toggle-btn" onclick="window.app.toggleTripStatus('${t.id}')">
          ${isCompleted ? '↺ Reactivar' : '✓ Completar'}
        </button>
      </div>
    </div>
    ${footerHtml}
  `;
}

/** @param {any} leg @param {string} cssClass @param {string} label */
function buildBoardingCard(leg, cssClass, label) {
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
        <span class="boarding-tag-luggage">🎒 Mochila 40x30x20cm</span>
      </div>
    </div>
  `;
}

/** @param {any} trip */
export function buildBoardingPassesHtml(trip) {
  const { outbound, inbound } = trip.flights;
  const hotel = trip.hotel || {};
  return `
    ${buildBoardingCard(outbound, 'outbound', '🛫 Vuelo de Ida')}
    ${buildBoardingCard(inbound, 'inbound', '🛬 Vuelo de Vuelta')}
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

export const EMPTY_TRIP_HTML = `
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
