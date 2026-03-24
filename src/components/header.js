import { el, $ } from '../utils/dom.js';
import { t, setLocale, getLocale } from '../core/i18n.js';
import { toggleTheme } from '../core/theme.js';

/**
 * Renders the application header into #app-header.
 * Highlights the active nav link based on current hash.
 */
export function renderHeader() {
  const container = $('#app-header');
  if (!container) return;

  container.innerHTML = '';

  const currentPage = (location.hash.replace('#/', '') || 'optimal');

  // Logo
  const logo = el('a', { href: '#/optimal', className: 'header-logo' },
    el('span', { className: 'header-pokeball' }, '\uD83C\uDFE0'),
    el('span', { className: 'header-title' }, 'Pokopia Housing')
  );

  // Nav links with active state
  const navLinks = [
    { page: 'optimal', key: 'nav.optimal', icon: '\u2600\uFE0F' },
    { page: 'planner', key: 'nav.planner', icon: '\uD83D\uDDD3\uFE0F' },
    { page: 'legal', key: 'nav.legal', icon: '\u2696\uFE0F' },
  ];

  const nav = el('nav', { className: 'header-nav', 'aria-label': 'Main navigation' });
  for (const link of navLinks) {
    const isActive = currentPage === link.page;
    const a = el('a', {
      href: `#/${link.page}`,
      className: 'header-nav-link' + (isActive ? ' header-nav-link--active' : ''),
      'aria-label': t(link.key),
    },
      el('span', { className: 'nav-icon' }, link.icon),
      el('span', { className: 'nav-label', 'data-i18n': link.key }, t(link.key))
    );
    if (isActive) {
      a.setAttribute('aria-current', 'page');
    }
    nav.appendChild(a);
  }

  // Language selector — compact, just flag emoji on mobile
  const languages = [
    { value: 'ja', label: '\uD83C\uDDEF\uD83C\uDDF5', fullLabel: '\uD83C\uDDEF\uD83C\uDDF5 \u65E5\u672C\u8A9E' },
    { value: 'en', label: '\uD83C\uDDEC\uD83C\uDDE7', fullLabel: '\uD83C\uDDEC\uD83C\uDDE7 English' },
    { value: 'fr', label: '\uD83C\uDDEB\uD83C\uDDF7', fullLabel: '\uD83C\uDDEB\uD83C\uDDF7 Fran\u00E7ais' },
    { value: 'de', label: '\uD83C\uDDE9\uD83C\uDDEA', fullLabel: '\uD83C\uDDE9\uD83C\uDDEA Deutsch' },
    { value: 'es', label: '\uD83C\uDDEA\uD83C\uDDF8', fullLabel: '\uD83C\uDDEA\uD83C\uDDF8 Espa\u00F1ol' },
  ];

  const currentLang = getLocale();
  const langSelect = el('select', {
    className: 'header-lang-select',
    'aria-label': t('a11y.languageSelector'),
    'data-i18n-aria': 'a11y.languageSelector',
  });

  for (const lang of languages) {
    const option = el('option', { value: lang.value }, lang.fullLabel);
    if (lang.value === currentLang) option.selected = true;
    langSelect.appendChild(option);
  }

  langSelect.addEventListener('change', async () => {
    await setLocale(langSelect.value);
    if (window.__pokopiaRerender) {
      window.__pokopiaRerender();
    } else {
      renderHeader();
    }
  });

  // Theme toggle
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const themeBtn = el('button', {
    className: 'header-theme-toggle',
    type: 'button',
    'aria-label': t('a11y.themeToggle'),
    'data-i18n-aria': 'a11y.themeToggle',
    onClick: () => {
      toggleTheme();
      const newTheme = document.documentElement.getAttribute('data-theme');
      themeBtn.textContent = newTheme === 'dark' ? '\u2600\uFE0F' : '\uD83C\uDF19';
    },
  }, currentTheme === 'dark' ? '\u2600\uFE0F' : '\uD83C\uDF19');

  // Assemble — single row: logo | nav | actions
  const headerInner = el('div', { className: 'header-inner' },
    logo,
    nav,
    el('div', { className: 'header-actions' },
      langSelect,
      themeBtn
    )
  );

  container.appendChild(headerInner);

  // Re-render header on navigation to update active state
  window.removeEventListener('hashchange', renderHeader);
  window.addEventListener('hashchange', renderHeader);
}
