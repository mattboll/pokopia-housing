import { el } from '../utils/dom.js';
import { t } from '../core/i18n.js';

/**
 * Registers the service worker (production only) and shows a small toast
 * when a new version is ready.
 */
export function initPwa() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;

  const base = import.meta.env.BASE_URL ?? '/pokopia-housing/';

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register(`${base}sw.js`);

      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        if (!worker) return;
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) {
            showUpdateToast(() => worker.postMessage('SKIP_WAITING'));
          }
        });
      });

      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      });
    } catch (err) {
      console.warn('Service worker registration failed', err);
    }
  });

  // Install prompt (Chromium): keep the event and expose a button in the footer
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    const footer = document.querySelector('.footer-bottom');
    if (!footer || footer.querySelector('.footer-install-btn')) return;
    const btn = el('button', {
      type: 'button',
      className: 'btn btn-secondary btn--sm footer-install-btn',
      onClick: async () => {
        btn.disabled = true;
        await e.prompt();
        btn.remove();
      },
    }, `📲 ${t('pwa.install')}`);
    footer.appendChild(el('span', { className: 'footer-separator' }, '·'));
    footer.appendChild(btn);
  });
}

function showUpdateToast(onReload) {
  const toast = el('div', { className: 'toast toast--visible', role: 'status' },
    el('span', null, `✨ ${t('pwa.updateAvailable')}`),
    el('button', { type: 'button', className: 'btn btn-primary btn--sm', onClick: onReload }, t('pwa.reload'))
  );
  document.body.appendChild(toast);
}
