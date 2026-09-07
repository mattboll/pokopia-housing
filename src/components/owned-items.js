import { el } from '../utils/dom.js';
import { t } from '../core/i18n.js';

const STORAGE_KEY = 'pokopia-housing-unowned-items';

/**
 * Loads the set of item slugs the player does NOT own (everything is owned
 * by default, the player unchecks what is missing).
 * @returns {Set<string>}
 */
export function loadUnowned() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return new Set(JSON.parse(raw).filter((s) => typeof s === 'string'));
  } catch { /* ignore */ }
  return new Set();
}

/** @param {Set<string>} unowned */
export function saveUnowned(unowned) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...unowned]));
  } catch { /* ignore */ }
}

/**
 * Owned set for the suggestion algorithm (null when everything is owned).
 * @param {import('../algorithm/items.js').Item[]} items
 * @param {Set<string>} unowned
 * @returns {Set<string> | null}
 */
export function ownedFrom(items, unowned) {
  if (unowned.size === 0) return null;
  return new Set(items.filter((it) => !it.food && !unowned.has(it.slug)).map((it) => it.slug));
}

/**
 * Collapsible panel listing every item with a checkbox ("I own it"), a
 * search field, and select all / none buttons.
 *
 * @param {import('../algorithm/items.js').Item[]} items
 * @param {Set<string>} unowned - mutated in place
 * @param {() => void} onChange
 * @returns {HTMLElement}
 */
export function createOwnedItemsPanel(items, unowned, onChange) {
  const real = items.filter((it) => !it.food);
  const tp = (pref) => (t(`preferences.${pref}`) !== `preferences.${pref}` ? t(`preferences.${pref}`) : pref);
  const label = (it) => (t(`items.${it.slug}`) !== `items.${it.slug}` ? t(`items.${it.slug}`) : it.name);

  const details = el('details', { className: 'advanced-filters owned-items' });
  const summaryCount = el('span', { className: 'owned-items__count' });
  const summary = el('summary', null, `🛋️ ${t('common.ownedItems')} `, summaryCount);
  details.appendChild(summary);

  function updateCount() {
    summaryCount.textContent = `(${real.length - unowned.size}/${real.length})`;
  }

  const body = el('div', { className: 'advanced-filters__body' });
  body.appendChild(el('p', { className: 'options-panel__hint' }, t('common.ownedItemsHint')));

  const search = el('input', { type: 'search', className: 'input owned-items__search', placeholder: t('common.searchItem'), 'aria-label': t('common.searchItem') });
  const list = el('div', { className: 'owned-items__list', role: 'list' });

  let query = '';
  let rendered = false;

  function renderList() {
    list.innerHTML = '';
    const q = query.toLowerCase();
    const shown = real.filter((it) => !q || label(it).toLowerCase().includes(q) || it.categories.some((c) => tp(c).toLowerCase().includes(q)));
    for (const it of shown) {
      const id = `own-${it.slug}`;
      const cb = el('input', { type: 'checkbox', id, className: 'owned-items__cb' });
      cb.checked = !unowned.has(it.slug);
      cb.addEventListener('change', () => {
        if (cb.checked) unowned.delete(it.slug); else unowned.add(it.slug);
        saveUnowned(unowned);
        updateCount();
        onChange();
      });
      list.appendChild(el('div', { className: 'owned-items__row', role: 'listitem' },
        cb,
        el('label', { for: id, className: 'owned-items__label' },
          el('span', null, label(it)),
          el('span', { className: 'owned-items__cats' }, it.categories.map(tp).join(' · '))
        )
      ));
    }
    if (shown.length === 0) list.appendChild(el('p', { className: 'options-panel__hint' }, t('common.noResults')));
  }

  search.addEventListener('input', () => { query = search.value.trim(); renderList(); });

  const setAll = (owned) => {
    if (owned) unowned.clear(); else for (const it of real) unowned.add(it.slug);
    saveUnowned(unowned);
    updateCount();
    renderList();
    onChange();
  };

  body.appendChild(el('div', { className: 'advanced-filters__row' },
    el('button', { type: 'button', className: 'btn btn-secondary btn--sm', onClick: () => setAll(true) }, `☑ ${t('common.all')}`),
    el('button', { type: 'button', className: 'btn btn-ghost btn--sm', onClick: () => setAll(false) }, `☐ ${t('common.none')}`)
  ));
  body.appendChild(search);
  body.appendChild(list);
  details.appendChild(body);

  // Render the (long) list only when the panel is opened
  details.addEventListener('toggle', () => {
    if (details.open && !rendered) { rendered = true; renderList(); }
  });

  updateCount();
  return details;
}
