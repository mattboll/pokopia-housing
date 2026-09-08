import { el } from '../utils/dom.js';
import { t } from '../core/i18n.js';
import { icon } from './icons.js';

/**
 * Side drawer (left on desktop, full-height sheet on narrow screens) with a
 * backdrop. `body` receives the content.
 *
 * @param {{title: string}} opts
 * @returns {{el: HTMLElement, body: HTMLElement, open: (focusSelector?: string) => void, close: () => void, isOpen: () => boolean}}
 */
export function createDrawer(opts) {
  const body = el('div', { className: 'drawer__body' });
  const closeBtn = el('button', { type: 'button', className: 'drawer__close', 'aria-label': t('detail.close'), onClick: () => api.close() }, icon('close', { size: 18 }));
  const panel = el('div', { className: 'drawer', role: 'dialog', 'aria-modal': 'true', 'aria-label': opts.title },
    el('div', { className: 'drawer__header' }, el('h2', { className: 'drawer__title' }, opts.title), closeBtn),
    body
  );
  const backdrop = el('div', { className: 'drawer__backdrop', onClick: () => api.close() });
  const root = el('div', { className: 'drawer-root', hidden: '' }, backdrop, panel);

  let open = false;
  let lastFocus = null;
  const onKey = (e) => { if (e.key === 'Escape' && open) api.close(); };

  const api = {
    el: root,
    body,
    isOpen: () => open,
    open(focusSelector) {
      lastFocus = document.activeElement;
      root.hidden = false;
      document.body.classList.add('has-drawer');
      open = true;
      document.addEventListener('keydown', onKey);
      requestAnimationFrame(() => {
        root.classList.add('drawer-root--open');
        const target = focusSelector ? body.querySelector(focusSelector) : null;
        if (target) { target.scrollIntoView({ block: 'start' }); if (target.focus) target.focus({ preventScroll: true }); }
        else closeBtn.focus();
      });
    },
    close() {
      if (!open) return;
      open = false;
      root.classList.remove('drawer-root--open');
      document.body.classList.remove('has-drawer');
      document.removeEventListener('keydown', onKey);
      setTimeout(() => { if (!open) root.hidden = true; }, 220);
      if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    },
  };
  return api;
}
