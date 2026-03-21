const SUPPORTED_LOCALES = ['ja', 'en', 'fr', 'de', 'es'];
const FALLBACK_LOCALE = 'en';
const STORAGE_KEY = 'pokopia-lang';

let currentLocale = FALLBACK_LOCALE;
let translations = {};

/**
 * Fetches a locale JSON file.
 *
 * @param {string} lang - Locale code
 * @returns {Promise<Object>} Parsed translations object
 */
async function loadLocaleFile(lang) {
  const base = import.meta.env.BASE_URL ?? '/pokopia-housing/';
  const url = `${base}i18n/${lang}.json`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load locale "${lang}": ${response.status}`);
  }
  return response.json();
}

/**
 * Matches a navigator language string to a supported locale.
 *
 * @param {string} navLang - e.g. 'fr-FR', 'en-US', 'ja'
 * @returns {string} Matched locale code or fallback
 */
function matchLocale(navLang) {
  const lang = navLang.toLowerCase();

  // Exact match
  if (SUPPORTED_LOCALES.includes(lang)) {
    return lang;
  }

  // Prefix match (e.g. 'fr-FR' -> 'fr')
  const prefix = lang.split('-')[0];
  if (SUPPORTED_LOCALES.includes(prefix)) {
    return prefix;
  }

  return FALLBACK_LOCALE;
}

/**
 * Initializes i18n: detects language from localStorage or navigator,
 * loads the locale file, and translates the DOM.
 */
export async function initI18n() {
  const stored = localStorage.getItem(STORAGE_KEY);

  if (stored && SUPPORTED_LOCALES.includes(stored)) {
    currentLocale = stored;
  } else {
    currentLocale = matchLocale(navigator.language || FALLBACK_LOCALE);
  }

  translations = await loadLocaleFile(currentLocale);
  document.documentElement.setAttribute('lang', currentLocale);
  translateDOM();
}

/**
 * Switches to a new locale, loads translations, updates the DOM,
 * and persists the choice.
 *
 * @param {string} lang - Locale code to switch to
 */
export async function setLocale(lang) {
  if (!SUPPORTED_LOCALES.includes(lang)) {
    console.warn(`Unsupported locale: "${lang}"`);
    return;
  }

  currentLocale = lang;
  translations = await loadLocaleFile(lang);
  document.documentElement.setAttribute('lang', lang);
  localStorage.setItem(STORAGE_KEY, lang);
  translateDOM();
}

/**
 * Looks up a translation by dot-notation key.
 * Returns the key itself if not found.
 *
 * @param {string} key - Dot-notation key, e.g. 'nav.optimal'
 * @returns {string} Translated string or the key
 */
export function t(key) {
  const parts = key.split('.');
  let value = translations;

  for (const part of parts) {
    if (value == null || typeof value !== 'object') {
      return key;
    }
    value = value[part];
  }

  return typeof value === 'string' ? value : key;
}

/**
 * Walks the DOM and translates elements with data-i18n (textContent)
 * and data-i18n-aria (aria-label) attributes.
 *
 * @param {Document|Element} root - Root element to walk
 */
export function translateDOM(root = document) {
  const textElements = root.querySelectorAll('[data-i18n]');
  for (const el of textElements) {
    const key = el.getAttribute('data-i18n');
    if (key) {
      el.textContent = t(key);
    }
  }

  const ariaElements = root.querySelectorAll('[data-i18n-aria]');
  for (const el of ariaElements) {
    const key = el.getAttribute('data-i18n-aria');
    if (key) {
      el.setAttribute('aria-label', t(key));
    }
  }
}

/**
 * Returns the current locale code.
 *
 * @returns {string} Current locale code
 */
export function getLocale() {
  return currentLocale;
}
