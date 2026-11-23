/**
 * Configuración PWA (Service Worker y botón de instalación)
 */

/**
 * @param {HTMLElement | null} installAppBtn
 */
export function setupPwa(installAppBtn) {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch((err) => {
        console.warn('[PWA] Service Worker no registrado:', err);
      });
    });
  }

  /** @type {any} */
  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (!installAppBtn) return;

    installAppBtn.style.display = 'inline-flex';
    installAppBtn.addEventListener('click', async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        installAppBtn.style.display = 'none';
      }
      deferredPrompt = null;
    });
  });

  window.addEventListener('appinstalled', () => {
    if (installAppBtn) installAppBtn.style.display = 'none';
  });
}
