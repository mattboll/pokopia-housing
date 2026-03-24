import './styles/reset.css';
import './styles/tokens.css';
import './styles/theme.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/pages.css';

import { $ } from './utils/dom.js';
import { initTheme } from './core/theme.js';
import { initI18n, t } from './core/i18n.js';
import { initRouter } from './core/router.js';
import { store } from './core/store.js';
import { loadPokemonData } from './core/data-loader.js';
import { loadPreferenceLinks } from './algorithm/scoring.js';
import { announce } from './utils/a11y.js';
import { renderHeader } from './components/header.js';
import { renderFooter } from './components/footer.js';
import { renderOptimalPage } from './pages/optimal.js';
import { renderPlannerPage } from './pages/planner.js';
import { renderLegalPage } from './pages/legal.js';

/**
 * Renders the appropriate page based on the route name.
 *
 * @param {string} page - Page name ('optimal', 'planner', 'legal')
 */
function renderPage(page) {
  const main = $('#app-main');
  if (main) {
    main.innerHTML = '';
  }

  store.setState({ currentPage: page });

  switch (page) {
    case 'optimal':
      renderOptimalPage();
      break;
    case 'planner':
      renderPlannerPage();
      break;
    case 'legal':
      renderLegalPage();
      break;
    default:
      renderOptimalPage();
  }

  // Focus main content for accessibility
  if (main) {
    main.setAttribute('tabindex', '-1');
    main.focus();
  }

  // Announce page change for screen readers
  const pageKey = `nav.${page}`;
  const pageName = t(pageKey);
  announce(pageName);
}

/**
 * Application bootstrap.
 */
async function init() {
  // Initialize theme (sync, from localStorage or system preference)
  initTheme();

  // Initialize i18n (async, loads locale file)
  await initI18n();

  // Load Pokemon data and preference links in parallel
  try {
    const [allPokemon] = await Promise.all([
      loadPokemonData(),
      loadPreferenceLinks(),
    ]);
    store.setState({ allPokemon });
  } catch (err) {
    console.error('Failed to load data:', err);
    store.setState({ allPokemon: [] });
  }

  // Render shell
  renderHeader();
  renderFooter();

  // Initialize router (renders initial page)
  initRouter(renderPage);

  // Expose re-render for language changes
  window.__pokopiaRerender = () => {
    renderHeader();
    renderFooter();
    const page = store.getState().currentPage || 'optimal';
    renderPage(page);
  };
}

init();
