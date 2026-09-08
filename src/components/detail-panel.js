import { el } from '../utils/dom.js';
import { t } from '../core/i18n.js';
import { icon } from './icons.js';
import { closePopover } from './pokemon-popover.js';

/**
 * Container for a house detail. Desktop (>= 1024px): an aside the page
 * places in a right column. Narrower: a bottom sheet with a backdrop.
 *
 * @param {{onClose?: () => void}} [opts]
 * @returns {{el: HTMLElement, open: (content: HTMLElement) => void, close: () => void, isOpen: () => boolean, update: (content: HTMLElement) => void}}
 */
export function createDetailPanel(opts = {}) {
  const body = el('div', { className: 'detail-panel__body' });
  const closeBtn = el('button', {
    type: 'button', className: 'detail-panel__close', 'aria-label': t('detail.close'),
    onClick: () => api.close(),
  }, icon('close', { size: 18 }));
  const handle = el('div', { className: 'detail-panel__handle', 'aria-hidden': 'true' });
  const sheet = el('aside', { className: 'detail-panel', role: 'dialog', 'aria-modal': 'false', 'aria-label': t('common.house'), hidden: '' }, handle, closeBtn, body);
  const backdrop = el('div', { className: 'detail-panel__backdrop', hidden: '', onClick: () => api.close() });
  const root = el('div', { className: 'detail-panel-root' }, backdrop, sheet);

  let open = false;

  // Swipe down to close (touch)
  let startY = null;
  sheet.addEventListener('touchstart', (e) => { startY = e.touches[0].clientY; }, { passive: true });
  sheet.addEventListener('touchend', (e) => {
    if (startY === null) return;
    const dy = e.changedTouches[0].clientY - startY;
    startY = null;
    if (dy > 90 && sheet.scrollTop <= 0) api.close();
  }, { passive: true });

  const onKey = (e) => { if (e.key === 'Escape' && open) api.close(); };

  const api = {
    el: root,
    isOpen: () => open,
    open(content) {
      body.innerHTML = '';
      body.appendChild(content);
      sheet.hidden = false;
      backdrop.hidden = false;
      root.classList.add('detail-panel-root--open');
      open = true;
      document.addEventListener('keydown', onKey);
      sheet.scrollTop = 0;
      requestAnimationFrame(() => sheet.classList.add('detail-panel--visible'));
    },
    update(content) {
      if (!open) return;
      body.innerHTML = '';
      body.appendChild(content);
    },
    close() {
      if (!open) return;
      open = false;
      closePopover();
      sheet.classList.remove('detail-panel--visible');
      root.classList.remove('detail-panel-root--open');
      document.removeEventListener('keydown', onKey);
      setTimeout(() => { if (!open) { sheet.hidden = true; backdrop.hidden = true; body.innerHTML = ''; } }, 220);
      if (opts.onClose) opts.onClose();
    },
  };
  return api;
}
