const ROUTES = ['optimal', 'planner', 'help', 'legal'];
const DEFAULT_ROUTE = 'optimal';

let renderCallback = null;

/**
 * Extracts the page name from the current hash.
 * Falls back to the default route if not recognized.
 *
 * @returns {string} Page name
 */
function getPageFromHash() {
  const hash = location.hash.replace('#/', '').split('?')[0].trim();
  return ROUTES.includes(hash) ? hash : DEFAULT_ROUTE;
}

/**
 * Returns the query parameters carried by the hash, e.g. `#/planner?p=abc`.
 *
 * @returns {URLSearchParams}
 */
export function getHashQuery() {
  const idx = location.hash.indexOf('?');
  return new URLSearchParams(idx === -1 ? '' : location.hash.slice(idx + 1));
}

/**
 * Removes the query part of the hash without triggering a re-render.
 */
export function clearHashQuery() {
  const page = getPageFromHash();
  history.replaceState(null, '', `${location.pathname}${location.search}#/${page}`);
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
