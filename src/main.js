import './styles/reset.css';
import './styles/tokens.css';
import './styles/theme.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/pages.css';
import './styles/village.css';

import { $ } from './utils/dom.js';
import { initTheme } from './core/theme.js';
import { initI18n, t } from './core/i18n.js';
import { initRouter } from './core/router.js';
import { store } from './core/store.js';
import { loadPokemonData, loadPokemonMeta, loadItems } from './core/data-loader.js';
import { prepareItems } from './algorithm/items.js';
import { loadPokemonIds } from './core/sprites.js';
import { renderHelpPage } from './pages/help.js';
import { announce } from './utils/a11y.js';
import { renderHeader } from './components/header.js';
import { renderFooter } from './components/footer.js';
import { renderOptimalPage } from './pages/optimal.js';
import { renderPlannerPage } from './pages/planner.js';
import { renderLegalPage } from './pages/legal.js';
import { initPwa } from './core/pwa.js';

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
    case 'help':
      renderHelpPage();
      break;
    default:
      renderOptimalPage();
  }

  // Focus main content for accessibility
  if (main) {
    main.setAttribute('tabindex', '-1');
    main.focus({ preventScroll: true });
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

  // Load Pokemon data
  try {
    const [allPokemon, pokemonMeta, itemsJson] = await Promise.all([loadPokemonData(), loadPokemonMeta(), loadItems(), loadPokemonIds()]);
    store.setState({ allPokemon, pokemonMeta, items: prepareItems(itemsJson) });
  } catch (err) {
    console.error('Failed to load Pokemon data:', err);
    store.setState({ allPokemon: [] });
  }

  // Render shell
  renderHeader();
  renderFooter();

  // Initialize router (renders initial page)
  initRouter(renderPage);

  // Offline support + install prompt
  initPwa();

  // Expose re-render for language changes
  window.__pokopiaRerender = () => {
    renderHeader();
    renderFooter();
    const page = store.getState().currentPage || 'optimal';
    renderPage(page);
  };
}

init();
