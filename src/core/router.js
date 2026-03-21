const ROUTES = ['optimal', 'planner', 'legal'];
const DEFAULT_ROUTE = 'optimal';

let renderCallback = null;

/**
 * Extracts the page name from the current hash.
 * Falls back to the default route if not recognized.
 *
 * @returns {string} Page name
 */
function getPageFromHash() {
  const hash = location.hash.replace('#/', '').trim();
  return ROUTES.includes(hash) ? hash : DEFAULT_ROUTE;
}

/**
 * Handles hash change events by calling the render callback.
 */
function onHashChange() {
  if (renderCallback) {
    const page = getPageFromHash();
    renderCallback(page);
  }
}

/**
 * Initializes the hash-based SPA router.
 * Calls renderPage immediately with the current route, then
 * listens for subsequent hash changes.
 *
 * @param {(pageName: string) => void} renderPage - Function called with the page name on route change
 */
export function initRouter(renderPage) {
  renderCallback = renderPage;
  window.addEventListener('hashchange', onHashChange);
  renderPage(getPageFromHash());
}

/**
 * Programmatically navigate to a page by setting the hash.
 *
 * @param {string} page - Page name (e.g. 'optimal', 'planner', 'legal')
 */
export function navigate(page) {
  location.hash = `#/${page}`;
}
