/**
 * Constantes de países y utilidades UI compartidas
 */

export const COUNTRY_FLAGS = {
  España: '🇪🇸', Spain: '🇪🇸',
  Italia: '🇮🇹', Italy: '🇮🇹',
  Portugal: '🇵🇹',
  Francia: '🇫🇷', France: '🇫🇷',
  Alemania: '🇩🇪', Germany: '🇩🇪',
  'Reino Unido': '🇬🇧', 'United Kingdom': '🇬🇧', UK: '🇬🇧',
  Irlanda: '🇮🇪', Ireland: '🇮🇪',
  Bélgica: '🇧🇪', Belgium: '🇧🇪',
  Suiza: '🇨🇭', Switzerland: '🇨🇭',
  Austria: '🇦🇹',
  'Países Bajos': '🇳🇱', Netherlands: '🇳🇱', Holanda: '🇳🇱',
  Polonia: '🇵🇱', Poland: '🇵🇱',
  Hungría: '🇭🇺', Hungary: '🇭🇺',
  'República Checa': '🇨🇿', 'Czech Republic': '🇨🇿',
  Marruecos: '🇲🇦', Morocco: '🇲🇦',
  Suecia: '🇸🇪', Sweden: '🇸🇪',
  Dinamarca: '🇩🇰', Denmark: '🇩🇰',
  Noruega: '🇳🇴', Norway: '🇳🇴',
  Grecia: '🇬🇷', Greece: '🇬🇷',
  Croacia: '🇭🇷', Croatia: '🇭🇷',
  Eslovaquia: '🇸🇰', Slovakia: '🇸🇰',
  Bulgaria: '🇧🇬',
  Malta: '🇲🇹',
  Luxemburgo: '🇱🇺', Luxembourg: '🇱🇺',
  Albania: '🇦🇱',
  Rumanía: '🇷🇴', Rumania: '🇷🇴', Romania: '🇷🇴',
  Lituania: '🇱🇹', Lithuania: '🇱🇹',
  Letonia: '🇱🇻', Latvia: '🇱🇻',
  Estonia: '🇪🇪',
  Jordania: '🇯🇴', Jordan: '🇯🇴',
};

/** @type {ReturnType<typeof setTimeout> | undefined} */
let toastTimeout;

/**
 * @param {string} message
 */
export function showToast(message) {
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

  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    if (!toast) return;
    toast.style.transform = 'translateX(-50%) translateY(100px)';
    toast.style.opacity = '0';
  }, 3500);
}

/**
 * @param {number} bytes
 */
export function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
