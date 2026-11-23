import { formatBytes, showToast } from './constants.js';

const AI_SIGNATURE_RULES = [
  { tokens: ['c2pa', 'c2pa.assertions', 'c2pa.claim'], label: 'Manifiesto C2PA (Content Credentials)', caseSensitive: true },
  { tokens: ['jumbf'], label: 'Caja JUMBF de IA', caseSensitive: true },
  { tokens: ['trainedAlgorithmicMedia'], label: 'IPTC: Imagen Generada por IA', caseSensitive: true },
  { tokens: ['compositeWithTrainedAlgorithmicMedia'], label: 'IPTC: Retoque Generativo de IA', caseSensitive: true },
  { tokens: ['firefly', 'adobe firefly'], label: 'Adobe Firefly AI', caseSensitive: false },
  { tokens: ['generative fill', 'relleno generativo'], label: 'Photoshop Generative Fill', caseSensitive: false },
  { tokens: ['midjourney'], label: 'Midjourney', caseSensitive: false },
  { tokens: ['dall-e', 'dalle'], label: 'OpenAI DALL-E', caseSensitive: false },
  { tokens: ['stable diffusion', 'comfyui', 'automatic1111'], label: 'Stable Diffusion / ComfyUI', caseSensitive: false },
  { tokens: ['magic eraser', 'magic editor', 'synthid'], label: 'Google Magic Eraser / SynthID', caseSensitive: false },
  { tokens: ['galaxy ai'], label: 'Samsung Galaxy AI', caseSensitive: false },
];

/**
 * Limpiador de Fotos Anti-IA (C2PA / XMP / IPTC Bypass vía Canvas)
 */
export class PhotoCleanerController {
  constructor() {
    /** @type {any[]} */
    this.cleanedPhotos = [];
    this.photoDropzone = document.getElementById('photoDropzone');
    this.photoCleanerInput = /** @type {HTMLInputElement | null} */ (document.getElementById('photoCleanerInput'));
    this.photoBrowseBtn = document.getElementById('photoBrowseBtn');
    this.photoActionsBar = document.getElementById('photoActionsBar');
    this.photoProcessedCount = document.getElementById('photoProcessedCount');
    this.downloadAllPhotosBtn = document.getElementById('downloadAllPhotosBtn');
    this.clearPhotosBtn = document.getElementById('clearPhotosBtn');
    this.photoResultsGrid = document.getElementById('photoResultsGrid');
  }

  bindEvents() {
    if (this.photoBrowseBtn && this.photoCleanerInput) {
      this.photoBrowseBtn.addEventListener('click', () => this.photoCleanerInput?.click());
    }
    if (this.photoCleanerInput) {
      this.photoCleanerInput.addEventListener('change', (e) => {
        this.handlePhotoFiles(/** @type {HTMLInputElement} */ (e.target).files);
      });
    }
    if (this.photoDropzone) {
      this.photoDropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        this.photoDropzone?.classList.add('dragover');
      });
      this.photoDropzone.addEventListener('dragleave', () => this.photoDropzone?.classList.remove('dragover'));
      this.photoDropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        this.photoDropzone?.classList.remove('dragover');
        if (e.dataTransfer?.files) this.handlePhotoFiles(e.dataTransfer.files);
      });
      this.photoDropzone.addEventListener('click', (e) => {
        if (e.target !== this.photoBrowseBtn) this.photoCleanerInput?.click();
      });
    }
    this.downloadAllPhotosBtn?.addEventListener('click', () => this.downloadAllCleanedPhotos());
    this.clearPhotosBtn?.addEventListener('click', () => this.clearCleanedPhotos());
  }

  /** @param {FileList | null} files */
  async handlePhotoFiles(files) {
    if (!files || files.length === 0) return;
    const validFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (validFiles.length === 0) {
      showToast('⚠️ Seleccioná archivos de imagen válidos (JPG, PNG, WEBP)');
      return;
    }
    showToast(`📸 Procesando y desinfectando ${validFiles.length} foto(s)...`);
    for (const file of validFiles) {
      await this.cleanSinglePhoto(file);
    }
    if (this.photoCleanerInput) this.photoCleanerInput.value = '';
    this.updatePhotoActionsBar();
    showToast(`✨ ${validFiles.length} foto(s) limpiadas con éxito`);
  }

  /** @param {File} file */
  async inspectFileForAiSignatures(file) {
    try {
      const buffer = await file.arrayBuffer();
      const slice = buffer.slice(0, Math.min(buffer.byteLength, 2 * 1024 * 1024));
      const text = new TextDecoder('iso-8859-1').decode(new Uint8Array(slice));
      const lower = text.toLowerCase();

      const signaturesFound = AI_SIGNATURE_RULES
        .filter((rule) => rule.tokens.some((tok) => (rule.caseSensitive ? text.includes(tok) : lower.includes(tok))))
        .map((rule) => rule.label);

      return { hasAi: signaturesFound.length > 0, signatures: signaturesFound };
    } catch {
      return { hasAi: false, signatures: [] };
    }
  }

  /** @param {File} file */
  async cleanSinglePhoto(file) {
    const aiAnalysis = await this.inspectFileForAiSignatures(file);
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;
          canvas.getContext('2d')?.drawImage(img, 0, 0);

          canvas.toBlob((blob) => {
            if (!blob) {
              resolve(undefined);
              return;
            }
            const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
            const photoItem = {
              id: `photo_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
              name: file.name,
              cleanName: `${baseName}_limpia.jpg`,
              blobUrl: URL.createObjectURL(blob),
              blob,
              hasAi: aiAnalysis.hasAi,
              signatures: aiAnalysis.signatures,
              originalSize: formatBytes(file.size),
              cleanSize: formatBytes(blob.size),
              width: canvas.width,
              height: canvas.height,
            };
            this.cleanedPhotos.unshift(photoItem);
            this.renderPhotoCard(photoItem);
            resolve(undefined);
          }, 'image/jpeg', 0.98);
        };
        img.src = String(e.target?.result || '');
      };
      reader.readAsDataURL(file);
    });
  }

  /** @param {any} photo */
  renderPhotoCard(photo) {
    if (!this.photoResultsGrid) return;
    const card = document.createElement('div');
    card.className = `photo-card ${photo.hasAi ? 'has-ai' : 'is-pure'}`;
    card.id = `card_${photo.id}`;

    const badgeHtml = photo.hasAi
      ? `<span class="photo-card-badge ai-detected">⚠️ IA Detectada (${photo.signatures.length})</span>`
      : '<span class="photo-card-badge pure">🟢 100% Pura</span>';

    const statusHtml = photo.hasAi
      ? `<div style="color: #fbbf24; font-weight: 700; font-size: 0.8rem;">⚠️ Rastros de IA encontrados:</div><div class="photo-signatures-tag">${photo.signatures.join(' • ')}</div><div style="color: #34d399; font-size: 0.75rem; margin-top: 4px;">✅ Desinfectada para Instagram</div>`
      : '<div style="color: #34d399; font-weight: 700; font-size: 0.8rem;">🟢 Foto Pura de Cámara</div><div style="color: var(--text-muted); font-size: 0.75rem;">Sin firmas C2PA ni metadatos de IA. Ya era segura para publicar.</div>';

    card.innerHTML = `
      <div class="photo-card-preview"><img src="${photo.blobUrl}" alt="${photo.name}" loading="lazy">${badgeHtml}</div>
      <div class="photo-card-body">
        <div class="photo-card-name" title="${photo.name}">${photo.name}</div>
        <div class="photo-card-meta"><span>${photo.width}x${photo.height}px</span><span>${photo.originalSize} ➔ ${photo.cleanSize}</span></div>
        ${statusHtml}
        <button class="photo-card-download-btn ${photo.hasAi ? 'btn-ai' : 'btn-pure'}" onclick="window.app.downloadSinglePhoto('${photo.id}')">
          <span>⬇️ ${photo.hasAi ? 'Descargar Desinfectada' : 'Descargar Copia Limpia'}</span>
        </button>
      </div>
    `;
    this.photoResultsGrid.prepend(card);
  }

  /** @param {string} id */
  downloadSinglePhoto(id) {
    const item = this.cleanedPhotos.find((p) => p.id === id);
    if (!item) return;
    this.triggerDownload(item.blobUrl, item.cleanName);
    showToast(`⬇️ Descargando ${item.cleanName}`);
  }

  downloadAllCleanedPhotos() {
    if (this.cleanedPhotos.length === 0) return;
    showToast(`⬇️ Descargando ${this.cleanedPhotos.length} foto(s) limpias...`);
    this.cleanedPhotos.forEach((item, index) => {
      setTimeout(() => this.triggerDownload(item.blobUrl, item.cleanName), index * 250);
    });
  }

  /** @param {string} url @param {string} fileName */
  triggerDownload(url, fileName) {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  clearCleanedPhotos() {
    this.cleanedPhotos.forEach((p) => URL.revokeObjectURL(p.blobUrl));
    this.cleanedPhotos = [];
    if (this.photoResultsGrid) this.photoResultsGrid.innerHTML = '';
    this.updatePhotoActionsBar();
    showToast('🗑️ Lista de fotos limpiada');
  }

  updatePhotoActionsBar() {
    if (!this.photoActionsBar) return;
    const total = this.cleanedPhotos.length;
    if (total === 0) {
      this.photoActionsBar.style.display = 'none';
      return;
    }
    this.photoActionsBar.style.display = 'flex';
    const aiCount = this.cleanedPhotos.filter((p) => p.hasAi).length;
    const pureCount = total - aiCount;
    if (this.photoProcessedCount) {
      this.photoProcessedCount.innerHTML = `
        <span>${total} foto${total > 1 ? 's' : ''} analizada${total > 1 ? 's' : ''}:</span>
        <span style="color: #fbbf24; margin-left: 6px;">⚠️ ${aiCount} con rastro de IA</span> •
        <span style="color: #34d399;">🟢 ${pureCount} pura${pureCount !== 1 ? 's' : ''}</span>
      `;
    }
  }
}
