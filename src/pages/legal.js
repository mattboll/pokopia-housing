import { el, $ } from '../utils/dom.js';
import { t } from '../core/i18n.js';

/**
 * Renders the Legal / Mentions page into #app-main.
 * Static content with data-i18n attributes for translation.
 * Styled with the page-legal design system classes.
 */
/**
 * Creates an obfuscated email link that bots can't scrape.
 * The address is assembled in JS at render time.
 */
function createObfuscatedEmail(user, domain) {
  const link = el('p', null);
  const a = document.createElement('a');
  a.textContent = `${user}[at]${domain}`;
  a.addEventListener('click', (e) => {
    e.preventDefault();
    window.location.href = `mailto:${user}@${domain}`;
  });
  a.href = '#';
  a.style.cursor = 'pointer';
  a.className = 'legal-email';
  link.appendChild(a);
  return link;
}

export function renderLegalPage() {
  const main = $('#app-main');
  if (!main) return;

  main.innerHTML = '';

  const page = el('div', { className: 'legal-page page-legal' },
    el('div', { className: 'page-legal__content' },
      el('h1', { className: 'page-legal__title', 'data-i18n': 'legal.title' },
        '\u2696\uFE0F ' + t('legal.title')
      ),

      el('section', { className: 'legal-section' },
        el('h2', null, '\u26A0\uFE0F Disclaimer'),
        el('p', { 'data-i18n': 'legal.disclaimer' }, t('legal.disclaimer'))
      ),

      el('section', { className: 'legal-section' },
        el('h2', null, '\u00AE Trademark'),
        el('p', { 'data-i18n': 'legal.trademark' }, t('legal.trademark'))
      ),

      el('section', { className: 'legal-section' },
        el('h2', null, '\uD83D\uDCDC License'),
        el('p', { 'data-i18n': 'legal.license' }, t('legal.license'))
      ),

      el('section', { className: 'legal-section' },
        el('h2', null, '\uD83D\uDC64 Author'),
        el('p', { 'data-i18n': 'legal.author' }, t('legal.author')),
        createObfuscatedEmail('mattboll', 'gmail.com')
      ),

      el('section', { className: 'legal-section' },
        el('h2', null, '\uD83D\uDCCA Data Sources'),
        el('p', { 'data-i18n': 'legal.dataSource' }, t('legal.dataSource'))
      ),

      el('section', { className: 'legal-section' },
        el('h2', null, '\uD83D\uDD12 Privacy'),
        el('p', { 'data-i18n': 'legal.noData' }, t('legal.noData'))
      )
    )
  );

  main.appendChild(page);
}
