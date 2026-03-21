const STORAGE_KEY = 'pokopia-theme';

/**
 * Applies the given theme to the document.
 *
 * @param {string} theme - 'light' or 'dark'
 */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
}

/**
 * Detects the preferred theme from localStorage or the system
 * prefers-color-scheme media query, then applies it.
 */
export function initTheme() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') {
    applyTheme(stored);
    return;
  }

  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(prefersDark ? 'dark' : 'light');
}

/**
 * Toggles between light and dark themes, persisting the
 * choice to localStorage.
 */
export function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  localStorage.setItem(STORAGE_KEY, next);
}
