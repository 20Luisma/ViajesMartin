import { showToast } from './constants.js';

/**
 * Controlador del Copiloto IA Contextual & Multimodal
 */
export class CopilotController {
  /**
   * @param {{ getActiveTrip: () => any, onTripUpdated: (trip: any) => void, onStartNewTrip: () => void }} callbacks
   */
  constructor(callbacks) {
    this.callbacks = callbacks;
    /** @type {{ data: string, mimeType: string, name: string } | null} */
    this.attachedFile = null;

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
  }

  bindEvents() {
    if (this.openCopilotBtn) this.openCopilotBtn.addEventListener('click', () => this.openCopilot());
    if (this.closeCopilotBtn) this.closeCopilotBtn.addEventListener('click', () => this.closeCopilot());
    if (this.copilotNewTripBtn) this.copilotNewTripBtn.addEventListener('click', () => this.startNewTripFlow());
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

  openCopilot() {
    if (!this.copilotDrawerOverlay) return;
    this.copilotDrawerOverlay.classList.add('open');
    if (!this.copilotMessages || this.copilotMessages.children.length === 0) {
      this.initWelcomeMessage();
    }
    this.copilotInput?.focus();
  }

  closeCopilot() {
    this.copilotDrawerOverlay?.classList.remove('open');
  }

  initWelcomeMessage(forceNeutral = false) {
    if (!this.copilotMessages) return;
    this.copilotMessages.innerHTML = '';
    const activeTrip = this.callbacks.getActiveTrip();
    const welcomeText = (!activeTrip || forceNeutral)
      ? '¡Buenas, Martín! Soy tu Copiloto de Viajes con memoria neutra y lista para tu próximo destino.\n\nTodavía no tenés un viaje activo seleccionado. Podés pasarme la captura o PDF de tus billetes con el clip 📎 o decirme a dónde viajás y tus fechas.'
      : `¡Buenas, Martín! Acá estoy con tu viaje a ${activeTrip.destinationCity || activeTrip.title || 'tu destino'} en la cabeza.\n\nPodés charlarme lo que quieras para ajustar paradas, horarios o alojamiento, o tocar "✨ Nuevo Viaje" para cargar otro destino.`;
    this.appendMessage('bot', welcomeText);
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
    this.appendMessage('user', text || `[Archivo adjunto: ${fileToSend?.name || 'archivo'}]`);
    if (this.copilotInput) this.copilotInput.value = '';
    this.clearAttachedFile();

    if (this.copilotSendBtn) this.copilotSendBtn.disabled = true;
    const loadingId = this.appendLoadingMessage();

    try {
      const res = await fetch('api.php?action=trip_copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, trip: this.callbacks.getActiveTrip(), file: fileToSend }),
      });
      const data = await res.json();
      this.removeLoadingMessage(loadingId);

      if (data.status && data.reply) {
        this.appendMessage('bot', data.reply);
        if (data.updatedTrip) {
          this.callbacks.onTripUpdated(data.updatedTrip);
          showToast('✨ Itinerario actualizado por el Copiloto IA');
        }
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
    msgDiv.innerHTML = `<span class="msg-avatar">${sender === 'user' ? '👤' : '🤖'}</span><div class="msg-bubble">${text.replace(/\n/g, '<br>')}</div>`;
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
