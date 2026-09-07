import { el } from '../utils/dom.js';
import { t } from '../core/i18n.js';
import { debounce } from '../utils/debounce.js';

/**
 * Creates a search field with an inline icon, a clear button, a result
 * counter, and keyboard shortcuts ("/" focuses it, Escape clears it).
 *
 * @param {(query: string) => void} onSearch - Callback fired on input (debounced)
 * @returns {HTMLElement & {setCount: (shown: number, total: number) => void}}
 */
export function createSearchBar(onSearch) {
  const debouncedSearch = debounce((query) => onSearch(query), 200);

  const input = el('input', {
    type: 'search',
    className: 'input search-bar',
    placeholder: t('common.search'),
    'aria-label': t('common.search'),
    autocomplete: 'off',
    spellcheck: 'false',
  });

  const clearBtn = el('button', {
    type: 'button',
    className: 'search-bar__clear',
    'aria-label': t('common.clear'),
    title: t('common.clear'),
    hidden: '',
    onClick: () => {
      input.value = '';
      clearBtn.hidden = true;
      onSearch('');
      input.focus();
    },
  }, '✕');

  const count = el('span', { className: 'search-bar__count', 'aria-live': 'polite' });

  input.addEventListener('input', () => {
    clearBtn.hidden = input.value.length === 0;
    debouncedSearch(input.value.trim().toLowerCase());
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && input.value) {
      e.preventDefault();
      input.value = '';
      clearBtn.hidden = true;
      onSearch('');
    }
  });

  // "/" anywhere on the page focuses the search field
  const onGlobalKey = (e) => {
    if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (!document.body.contains(input)) {
      document.removeEventListener('keydown', onGlobalKey);
      return;
    }
    e.preventDefault();
    input.focus();
    input.select();
  };
  document.addEventListener('keydown', onGlobalKey);

  const wrapper = el('div', { className: 'search-bar-wrapper' },
    el('div', { className: 'search-bar-field' },
      el('span', { className: 'search-bar-icon', 'aria-hidden': 'true' }, '🔍'),
      input,
      clearBtn,
      el('kbd', { className: 'search-bar__kbd', 'aria-hidden': 'true', title: t('common.searchShortcut') }, '/')
    ),
    count
  );

  wrapper.setCount = (shown, total) => {
    count.textContent = t('common.shownCount').replace('{shown}', String(shown)).replace('{total}', String(total));
  };

  return wrapper;
}
