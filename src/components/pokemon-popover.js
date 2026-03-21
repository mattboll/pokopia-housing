import { el } from '../utils/dom.js';
import { t } from '../core/i18n.js';

const ENV_EMOJI = {
  Lumineux: '\u2600\uFE0F',
  Sombre: '\uD83C\uDF19',
  Chaud: '\uD83D\uDD25',
  Frais: '\u2744\uFE0F',
  Humide: '\uD83D\uDCA7',
  Sec: '\uD83C\uDFDC\uFE0F',
};

let activePopover = null;

/**
 * Closes any currently open popover.
 */
export function closePopover() {
  if (activePopover) {
    activePopover.remove();
    activePopover = null;
  }
}

// Close on Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closePopover();
});

// Close on click outside
document.addEventListener('click', (e) => {
  if (activePopover && !activePopover.contains(e.target)
      && !e.target.closest('.pokemon-name-btn')
      && !e.target.closest('.prefs-more-btn')) {
    closePopover();
  }
});

/**
 * Positions a popover near an anchor element, keeping it in viewport.
 * On mobile (<640px), snaps to bottom as a sheet.
 */
function positionPopover(popover, anchor) {
  document.body.appendChild(popover);
  activePopover = popover;

  const anchorRect = anchor.getBoundingClientRect();
  const popRect = popover.getBoundingClientRect();

  let top = anchorRect.bottom + 8;
  let left = anchorRect.left + (anchorRect.width / 2) - (popRect.width / 2);

  if (left < 8) left = 8;
  if (left + popRect.width > window.innerWidth - 8) left = window.innerWidth - popRect.width - 8;
  if (top + popRect.height > window.innerHeight - 8) {
    top = anchorRect.top - popRect.height - 8;
  }

  popover.style.position = 'fixed';
  popover.style.top = `${top}px`;
  popover.style.left = `${left}px`;
  popover.style.zIndex = '500';

  popover.setAttribute('tabindex', '-1');
  popover.focus();
}

/**
 * Shows a popover with a Pokemon's full preference list.
 * Shared preferences (if provided) are visually highlighted.
 *
 * @param {Object} pokemon - { name, environment, preferences[] }
 * @param {HTMLElement} anchor - element to position near
 * @param {string[]} [sharedPrefs=[]] - preferences shared with housemates (highlighted)
 */
export function showPokemonPopover(pokemon, anchor, sharedPrefs = []) {
  closePopover();

  const translatedName = t(`pokemon.${pokemon.name}`) !== `pokemon.${pokemon.name}`
    ? t(`pokemon.${pokemon.name}`)
    : pokemon.name;

  const envEmoji = ENV_EMOJI[pokemon.environment] || '';
  const translatedEnv = t(`environments.${pokemon.environment}`) !== `environments.${pokemon.environment}`
    ? t(`environments.${pokemon.environment}`)
    : pokemon.environment;

  const sharedSet = new Set(sharedPrefs);

  // Build preference list
  const prefList = el('ul', { className: 'popover__pref-list' });
  for (const pref of pokemon.preferences) {
    const isShared = sharedSet.has(pref);
    const translatedPref = t(`preferences.${pref}`) !== `preferences.${pref}`
      ? t(`preferences.${pref}`)
      : pref;

    const li = el('li', {
      className: 'popover__pref-item' + (isShared ? ' popover__pref-item--shared' : ''),
    },
      el('span', { className: 'popover__pref-icon' }, isShared ? '\u2705' : '\u25CB'),
      el('span', null, translatedPref)
    );
    prefList.appendChild(li);
  }

  // Legend if we have shared context
  const legend = sharedPrefs.length > 0
    ? el('p', { className: 'popover__legend' },
        '\u2705 = ',
        el('span', { 'data-i18n': 'common.sharedPrefs' }, t('common.sharedPrefs'))
      )
    : null;

  // Close button
  const closeBtn = el('button', {
    className: 'popover__close',
    type: 'button',
    'aria-label': 'Close',
    onClick: (e) => { e.stopPropagation(); closePopover(); },
  }, '\u2715');

  // Assemble popover
  const popover = el('div', {
    className: 'popover pokemon-popover',
    role: 'dialog',
    'aria-label': translatedName,
  },
    closeBtn,
    el('div', { className: 'popover__header' },
      el('span', { className: 'popover__name' }, translatedName),
      el('span', { className: 'popover__env' }, `${envEmoji} ${translatedEnv}`)
    ),
    el('div', { className: 'popover__body' },
      el('h4', { className: 'popover__section-title' },
        `\uD83C\uDFAF ${t('common.uniquePrefs') !== 'common.uniquePrefs' ? t('common.uniquePrefs') : 'Preferences'} (${pokemon.preferences.length})`
      ),
      prefList,
      legend
    )
  );

  positionPopover(popover, anchor);
}

/**
 * Shows a popover with a full list of preferences (used for "+N" overflow).
 *
 * @param {string[]} allPrefs - complete list of preference keys
 * @param {string[]} sharedPrefs - preferences shared by all (highlighted green)
 * @param {string} title - popover title
 * @param {HTMLElement} anchor - element to position near
 */
export function showPrefsListPopover(allPrefs, sharedPrefs, title, anchor) {
  closePopover();

  const sharedSet = new Set(sharedPrefs);

  const prefList = el('ul', { className: 'popover__pref-list' });
  for (const pref of allPrefs) {
    const isShared = sharedSet.has(pref);
    const translatedPref = t(`preferences.${pref}`) !== `preferences.${pref}`
      ? t(`preferences.${pref}`) : pref;

    prefList.appendChild(el('li', {
      className: 'popover__pref-item' + (isShared ? ' popover__pref-item--shared' : ''),
    },
      el('span', { className: 'popover__pref-icon' }, isShared ? '\u2764\uFE0F' : '\uD83D\uDECB\uFE0F'),
      el('span', null, translatedPref)
    ));
  }

  const legend = el('p', { className: 'popover__legend' },
    '\u2764\uFE0F = ',
    el('span', null, t('common.allLike') !== 'common.allLike' ? t('common.allLike') : 'Tous aiment'),
    el('span', null, '  \uD83D\uDECB\uFE0F = '),
    el('span', null, t('common.itemsToFind') !== 'common.itemsToFind' ? t('common.itemsToFind') : 'Objets a trouver')
  );

  const closeBtn = el('button', {
    className: 'popover__close',
    type: 'button',
    'aria-label': 'Close',
    onClick: (e) => { e.stopPropagation(); closePopover(); },
  }, '\u2715');

  const popover = el('div', {
    className: 'popover pokemon-popover',
    role: 'dialog',
    'aria-label': title,
  },
    closeBtn,
    el('div', { className: 'popover__header' },
      el('span', { className: 'popover__name' }, title),
      el('span', { className: 'popover__env' }, `${allPrefs.length} total`)
    ),
    el('div', { className: 'popover__body' }, prefList, legend)
  );

  positionPopover(popover, anchor);
}

/**
 * Creates a clickable Pokemon name button that opens the popover.
 *
 * @param {Object} pokemon - { name, environment, preferences[] }
 * @param {string[]} [sharedPrefs=[]] - shared preferences to highlight
 * @returns {HTMLElement}
 */
export function createPokemonNameButton(pokemon, sharedPrefs = []) {
  const translatedName = t(`pokemon.${pokemon.name}`) !== `pokemon.${pokemon.name}`
    ? t(`pokemon.${pokemon.name}`)
    : pokemon.name;

  const btn = el('button', {
    type: 'button',
    className: 'pokemon-name-btn',
    title: translatedName,
    onClick: (e) => {
      e.stopPropagation();
      showPokemonPopover(pokemon, btn, sharedPrefs);
    },
  }, translatedName);

  return btn;
}
