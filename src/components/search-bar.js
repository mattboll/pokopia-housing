import { el } from '../utils/dom.js';
import { t } from '../core/i18n.js';
import { debounce } from '../utils/debounce.js';

/**
 * Creates a search bar input element with debounced search callback.
 *
 * @param {(query: string) => void} onSearch - Callback fired on input (debounced)
 * @returns {HTMLElement}
 */
export function createSearchBar(onSearch) {
  const debouncedSearch = debounce((query) => onSearch(query), 300);

  const input = el('input', {
    type: 'search',
    className: 'search-bar',
    placeholder: t('common.search'),
    'data-i18n': 'common.search',
    'aria-label': t('common.search'),
  });

  input.addEventListener('input', () => {
    debouncedSearch(input.value.trim().toLowerCase());
  });

  const wrapper = el('div', { className: 'search-bar-wrapper' },
    el('span', { className: 'search-bar-icon', 'aria-hidden': 'true' }, '\u{1F50D}'),
    input
  );

  return wrapper;
}
