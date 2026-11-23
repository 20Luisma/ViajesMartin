/**
 * Vuelos Martín - Frontend Application Orchestrator v4.1
 * Modularizado en public/js/modules/
 */

import { setupPwa } from './modules/pwa.js';
import { RadarController } from './modules/radar.js';
import { TripsController } from './modules/trips.js';
import { CopilotController } from './modules/copilot.js';
import { PhotoCleanerController } from './modules/photoCleaner.js';

class VuelosApp {
  constructor() {
    this.currentView = 'radar';
    this.currentSubtab = 'itinerary';

    this.radarView = document.getElementById('radarView');
    this.tripsView = document.getElementById('tripsView');
    this.navRadarBtn = document.getElementById('navRadarBtn');
    this.navTripsBtn = document.getElementById('navTripsBtn');
    this.openCopilotBtn = document.getElementById('openCopilotBtn');
    this.tripSubnavPills = document.querySelectorAll('.trip-subnav-pill');
    this.tripSubItinerary = document.getElementById('tripSubItinerary');
    this.tripSubChecklist = document.getElementById('tripSubChecklist');
    this.tripSubTips = document.getElementById('tripSubTips');
    this.tripSubPhotos = document.getElementById('tripSubPhotos');

    this.radar = new RadarController();
    this.trips = new TripsController(() => this.copilot.initWelcomeMessage());
    this.copilot = new CopilotController({
      getActiveTrip: () => this.trips.activeTrip,
      onTripUpdated: (trip) => this.trips.setActiveTrip(trip),
      onStartNewTrip: () => {
        this.trips.activeTrip = null;
        this.trips.renderTrips();
      },
    });
    this.photoCleaner = new PhotoCleanerController();

    this.bindNavigation();
    this.radar.bindEvents();
    this.copilot.bindEvents();
    this.photoCleaner.bindEvents();
    setupPwa(document.getElementById('installAppBtn'));

    this.radar.loadDeals();
    this.trips.loadTrips(false);
  }

  bindNavigation() {
    this.navRadarBtn?.addEventListener('click', () => this.switchView('radar'));
    this.navTripsBtn?.addEventListener('click', () => this.switchView('trips'));

    this.tripSubnavPills.forEach((pill) => {
      pill.addEventListener('click', () => {
        this.tripSubnavPills.forEach((p) => p.classList.remove('active'));
        pill.classList.add('active');
        this.switchTripSubtab(/** @type {HTMLElement} */ (pill).dataset.subtab || 'itinerary');
      });
    });
  }

  /** @param {'radar' | 'trips'} viewName */
  switchView(viewName) {
    this.currentView = viewName;
    const isRadar = viewName === 'radar';
    this.navRadarBtn?.classList.toggle('active', isRadar);
    this.navTripsBtn?.classList.toggle('active', !isRadar);
    if (this.radarView) this.radarView.style.display = isRadar ? 'block' : 'none';
    if (this.tripsView) this.tripsView.style.display = isRadar ? 'none' : 'block';
    if (this.openCopilotBtn) this.openCopilotBtn.style.display = isRadar ? 'none' : 'flex';
    if (!isRadar) this.trips.renderTrips();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /** @param {string} subtab */
  switchTripSubtab(subtab) {
    this.currentSubtab = subtab;
    if (this.tripSubItinerary) this.tripSubItinerary.style.display = subtab === 'itinerary' ? 'block' : 'none';
    if (this.tripSubChecklist) this.tripSubChecklist.style.display = subtab === 'checklist' ? 'block' : 'none';
    if (this.tripSubTips) this.tripSubTips.style.display = subtab === 'tips' ? 'block' : 'none';
    if (this.tripSubPhotos) this.tripSubPhotos.style.display = subtab === 'photos' ? 'block' : 'none';
  }

  /** @param {any} deal */
  sendTelegram(deal) { return this.radar.sendTelegram(deal); }
  openCopilot() { return this.copilot.openCopilot(); }
  /** @param {string} id */
  toggleChecklist(id) { return this.trips.toggleChecklist(id); }
  addChecklist() { return this.trips.addChecklist(); }
  /** @param {string} id */
  downloadSinglePhoto(id) { return this.photoCleaner.downloadSinglePhoto(id); }
}

document.addEventListener('DOMContentLoaded', () => {
  /** @type {any} */ (window).app = new VuelosApp();
});
