import { showToast } from './constants.js';

const HISTORY_STORAGE_PREFIX = 'vuelos_copilot_history_';
const MAX_STORED_MESSAGES = 30;
const MAX_SENT_HISTORY = 10;

/** @param {string} str */
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Controlador del Copiloto IA Contextual & Multimodal con memoria persistente
 */
export class CopilotController {
  /**
   * @param {{ getActiveTrip: () => any, onTripUpdated: (trip: any) => void, onStartNewTrip: () => void }} callbacks
   */
  constructor(callbacks) {
    this.callbacks = callbacks;
    /** @type {{ data: string, mimeType: string, name: string } | null} */
    this.attachedFile = null;
    /** @type {{ role: 'user' | 'model', text: string }[]} */
    this.history = [];
    this.currentStorageKey = '';

    this.openCopilotBtn = document.getElementById('openCopilotBtn');
    this.copilotDrawerOverlay = document.getElementById('copilotDrawerOverlay');
    this.closeCopilotBtn = document.getElementById('closeCopilotBtn');
    this.copilotMessages = document.getElementById('copilotMessages');
    this.copilotForm = document.getElementById('copilotForm');
    this.copilotInput = /** @type {HTMLInputElement | null} */ (document.getElementById('copilotInput'));
    this.copilotFileInput = /** @type {HTMLInputElement | null} */ (document.getElementById('copilotFileInput'));
    this.copilotAttachBtn = document.getElementById('copilotAttachBtn');
    this.copilotFilePreview = document.getElementById('copilotFilePreview');
    this.filePreviewName = document.getElementById('filePreviewName');
    this.removeFileBtn = document.getElementById('removeFileBtn');
    this.copilotSendBtn = /** @type {HTMLButtonElement | null} */ (document.getElementById('copilotSendBtn'));
    this.copilotNewTripBtn = document.getElementById('copilotNewTripBtn');
    this.copilotClearChatBtn = document.getElementById('copilotClearChatBtn');
  }

  bindEvents() {
    if (this.openCopilotBtn) this.openCopilotBtn.addEventListener('click', () => this.openCopilot());
    if (this.closeCopilotBtn) this.closeCopilotBtn.addEventListener('click', () => this.closeCopilot());
    if (this.copilotNewTripBtn) this.copilotNewTripBtn.addEventListener('click', () => this.startNewTripFlow());
    if (this.copilotClearChatBtn) this.copilotClearChatBtn.addEventListener('click', () => this.clearChatHistory());
    if (this.copilotDrawerOverlay) {
      this.copilotDrawerOverlay.addEventListener('click', (e) => {
        if (e.target === this.copilotDrawerOverlay) this.closeCopilot();
      });
    }
    if (this.copilotAttachBtn && this.copilotFileInput) {
      this.copilotAttachBtn.addEventListener('click', () => this.copilotFileInput?.click());
      this.copilotFileInput.addEventListener('change', (e) => this.handleFileAttach(e));
    }
    if (this.removeFileBtn) this.removeFileBtn.addEventListener('click', () => this.clearAttachedFile());
    if (this.copilotForm) {
      this.copilotForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.submitMessage();
      });
    }
  }

  /** @param {boolean} forceNeutral */
  getStorageKey(forceNeutral = false) {
    const activeTrip = forceNeutral ? null : this.callbacks.getActiveTrip();
    const tripId = activeTrip?.id ? String(activeTrip.id) : 'neutral';
    return `${HISTORY_STORAGE_PREFIX}${tripId}`;
  }

  /** @param {string} key */
  loadHistoryFromStorage(key) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(
        (m) => m && (m.role === 'user' || m.role === 'model') && typeof m.text === 'string' && m.text.trim() !== '',
      );
    } catch {
      return [];
    }
  }

  saveHistoryToStorage() {
    if (!this.currentStorageKey) return;
    try {
      const trimmed = this.history.slice(-MAX_STORED_MESSAGES);
      this.history = trimmed;
      window.localStorage.setItem(this.currentStorageKey, JSON.stringify(trimmed));
    } catch {
      // Silencioso en modo privado o sin cuota
    }
  }

  openCopilot() {
    if (!this.copilotDrawerOverlay) return;
    this.copilotDrawerOverlay.classList.add('open');
    const expectedKey = this.getStorageKey(false);
    if (!this.copilotMessages || this.copilotMessages.children.length === 0 || this.currentStorageKey !== expectedKey) {
      this.initWelcomeMessage(false);
    }
    this.copilotInput?.focus();
  }

  closeCopilot() {
    this.copilotDrawerOverlay?.classList.remove('open');
  }

  initWelcomeMessage(forceNeutral = false) {
    if (!this.copilotMessages) return;
    this.copilotMessages.innerHTML = '';
    this.currentStorageKey = this.getStorageKey(forceNeutral);
    this.history = this.loadHistoryFromStorage(this.currentStorageKey);

    const activeTrip = forceNeutral ? null : this.callbacks.getActiveTrip();
    const welcomeText = (!activeTrip || forceNeutral)
      ? '¡Buenas, Martín! Soy tu Copiloto de Viajes con memoria neutra y lista para tu próximo destino.\n\nTodavía no tenés un viaje activo seleccionado. Podés pasarme la captura o PDF de tus billetes con el clip 📎 o decirme a dónde viajás y tus fechas.'
      : `¡Buenas, Martín! Acá estoy con tu viaje a ${activeTrip.destinationCity || activeTrip.title || 'tu destino'} en la cabeza (con memoria de hilo activa).\n\nPodés charlarme lo que quieras para ajustar paradas, horarios o alojamiento, o tocar "✨ Nuevo Viaje" para cargar otro destino.`;
    this.appendMessage('bot', welcomeText);

    this.history.forEach((entry) => {
      this.appendMessage(entry.role === 'user' ? 'user' : 'bot', entry.text);
    });
  }

  clearChatHistory() {
    this.history = [];
    if (this.currentStorageKey) {
      try {
        window.localStorage.removeItem(this.currentStorageKey);
      } catch {
        // ignore
      }
    }
    this.initWelcomeMessage(false);
    showToast('🧹 Hilo del Copiloto limpiado.');
  }

  startNewTripFlow() {
    this.clearAttachedFile();
    this.callbacks.onStartNewTrip();
    this.initWelcomeMessage(true);
    showToast('✨ Modo Nuevo Viaje activado. Memoria limpia.');
    this.copilotInput?.focus();
  }

  /** @param {Event} e */
  handleFileAttach(e) {
    const input = /** @type {HTMLInputElement} */ (e.target);
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      this.attachedFile = {
        data: result.split(',')[1] || '',
        mimeType: file.type || 'image/jpeg',
        name: file.name,
      };
      if (this.filePreviewName) this.filePreviewName.innerText = file.name;
      if (this.copilotFilePreview) this.copilotFilePreview.style.display = 'flex';
      showToast(`📎 Archivo cargado: ${file.name}`);
    };
    reader.readAsDataURL(file);
  }

  clearAttachedFile() {
    this.attachedFile = null;
    if (this.copilotFileInput) this.copilotFileInput.value = '';
    if (this.copilotFilePreview) this.copilotFilePreview.style.display = 'none';
  }

  async submitMessage() {
    const text = this.copilotInput?.value.trim() || '';
    if (!text && !this.attachedFile) return;

    const fileToSend = this.attachedFile ? { ...this.attachedFile } : null;
    const displayUserText = text || `[Archivo adjunto: ${fileToSend?.name || 'archivo'}]`;
    const historyToSend = this.history.slice(-MAX_SENT_HISTORY);

    this.appendMessage('user', displayUserText);
    this.history.push({ role: 'user', text: displayUserText });
    this.saveHistoryToStorage();

    if (this.copilotInput) this.copilotInput.value = '';
    this.clearAttachedFile();

    if (this.copilotSendBtn) this.copilotSendBtn.disabled = true;
    const loadingId = this.appendLoadingMessage();

    try {
      const res = await fetch('api.php?action=trip_copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          trip: this.callbacks.getActiveTrip(),
          file: fileToSend,
          history: historyToSend,
        }),
      });
      const data = await res.json();
      this.removeLoadingMessage(loadingId);

      if (data.status && data.reply) {
        this.appendMessage('bot', data.reply);
        this.history.push({ role: 'model', text: data.reply });
        if (data.updatedTrip) {
          const prevKey = this.currentStorageKey;
          this.callbacks.onTripUpdated(data.updatedTrip);
          const nextKey = this.getStorageKey(false);
          if (nextKey !== prevKey) {
            this.currentStorageKey = nextKey;
          }
          showToast('✨ Itinerario actualizado por el Copiloto IA');
        }
        this.saveHistoryToStorage();
      } else {
        this.appendMessage('bot', `⚠️ Hubo un detalle: ${data.message || 'No pude procesar la consulta.'}`);
      }
    } catch {
      this.removeLoadingMessage(loadingId);
      this.appendMessage('bot', '❌ Error de conexión al consultar con el Copiloto.');
    } finally {
      if (this.copilotSendBtn) this.copilotSendBtn.disabled = false;
    }
  }

  /** @param {'user' | 'bot'} sender @param {string} text */
  appendMessage(sender, text) {
    if (!this.copilotMessages) return;
    const msgDiv = document.createElement('div');
    msgDiv.className = `copilot-msg ${sender}`;
    msgDiv.innerHTML = `<span class="msg-avatar">${sender === 'user' ? '👤' : '🤖'}</span><div class="msg-bubble">${escapeHtml(text).replace(/\n/g, '<br>')}</div>`;
    this.copilotMessages.appendChild(msgDiv);
    this.copilotMessages.scrollTop = this.copilotMessages.scrollHeight;
  }

  appendLoadingMessage() {
    if (!this.copilotMessages) return null;
    const id = `loading_${Date.now()}`;
    const msgDiv = document.createElement('div');
    msgDiv.id = id;
    msgDiv.className = 'copilot-msg bot';
    msgDiv.innerHTML = '<span class="msg-avatar">🤖</span><div class="msg-bubble" style="color: var(--accent-cyan); font-style: italic;">Pensando y ajustando itinerario...</div>';
    this.copilotMessages.appendChild(msgDiv);
    this.copilotMessages.scrollTop = this.copilotMessages.scrollHeight;
    return id;
  }

  /** @param {string | null} id */
  removeLoadingMessage(id) {
    if (id) document.getElementById(id)?.remove();
  }
}
