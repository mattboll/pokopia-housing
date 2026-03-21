import { el, $ } from '../utils/dom.js';
import { t } from '../core/i18n.js';

/**
 * Renders the application footer into #app-footer.
 * Compact styling with disclaimer, legal link, and author credit.
 */
export function renderFooter() {
  const container = $('#app-footer');
  if (!container) return;

  container.innerHTML = '';

  const footerInner = el('div', { className: 'footer-inner' },
    el('p', { className: 'footer-disclaimer', 'data-i18n': 'legal.disclaimer' },
      t('legal.disclaimer')
    ),
    el('div', { className: 'footer-bottom' },
      el('a', { href: '#/legal', className: 'footer-legal-link', 'data-i18n': 'nav.legal' }, t('nav.legal')),
      el('span', { className: 'footer-separator' }, '\u00B7'),
      el('span', { className: 'footer-author' }, 'Made with \u2764\uFE0F by mbollot'),
      el('span', { className: 'footer-separator' }, '\u00B7'),
      el('span', { className: 'footer-license' }, 'MIT License')
    )
  );

  container.appendChild(footerInner);
}
