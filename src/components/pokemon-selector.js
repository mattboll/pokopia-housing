import { el } from '../utils/dom.js';
import { t } from '../core/i18n.js';
import { createSearchBar } from './search-bar.js';
import { createEnvironmentFilter } from './environment-filter.js';
import { loadPokemonIds, spriteUrl } from '../core/sprites.js';

const ENV_COLORS = {
  Lumineux: '#f5c518', Sombre: '#6b3fa0', Chaud: '#e85d3a',
  Frais: '#5cc5e8', Humide: '#3b82d6', Sec: '#c2956a',
};

const STORAGE_KEY = 'pokopia-housing-selected';

/**
 * Loads saved selection from localStorage.
 */
function loadSavedSelection() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return new Set(JSON.parse(saved));
  } catch (e) { /* ignore */ }
  return new Set();
}

/**
 * Saves selection to localStorage.
 */
export function saveSelection(selected) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...selected]));
  } catch (e) { /* ignore */ }
}

function normalize(str) {
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Creates a Pokedex-style Pokemon selector with sprite icons.
 *
 * @param {Array<{name: string, environment: string, preferences: string[]}>} allPokemon
 * @param {import('../core/store.js').store} store
 * @returns {HTMLElement}
 */
export function createPokemonSelector(allPokemon, store) {
  let searchQuery = '';
  let envFilter = [];
  const meta = store.getState().pokemonMeta || {};
  const advanced = { sources: new Set(), region: '', specialty: '', underwater: false };

  // Restore saved selection
  const saved = loadSavedSelection();
  if (saved.size > 0) {
    store.setState({ selectedPokemon: saved });
  }

  const section = el('section', { className: 'pokemon-selector' });

  // Count display
  const countDisplay = el('span', { className: 'selector-count' });

  function updateCount() {
    const selected = store.getState().selectedPokemon;
    const count = selected instanceof Set ? selected.size : 0;
    const text = t('common.selectedCount').replace('{count}', String(count));
    countDisplay.textContent = text;
  }

  // Search bar
  const searchBar = createSearchBar((query) => {
    searchQuery = query;
    renderGrid();
  });

  // Environment filter
  const envFilterEl = createEnvironmentFilter((selectedEnvs) => {
    envFilter = selectedEnvs;
    renderGrid();
  });

  // Select All / Clear buttons
  const selectAllBtn = el('button', {
    type: 'button',
    className: 'btn btn-secondary btn--sm',
    onClick: () => {
      const visible = getVisiblePokemon();
      const current = new Set(store.getState().selectedPokemon);
      for (const p of visible) current.add(p.name);
      store.setState({ selectedPokemon: current });
      saveSelection(current);
      renderGrid();
      updateCount();
    },
  }, t('common.selectAll'));

  const clearBtn = el('button', {
    type: 'button',
    className: 'btn btn-ghost btn--sm',
    onClick: () => {
      const empty = new Set();
      store.setState({ selectedPokemon: empty });
      saveSelection(empty);
      renderGrid();
      updateCount();
    },
  }, t('common.clear'));

  const actions = el('div', { className: 'selector-actions' },
    selectAllBtn, clearBtn, countDisplay
  );

  // Grid container — Pokedex style, inside a wrapper that shows a scroll cue
  const grid = el('div', { className: 'dex-grid', role: 'grid', 'aria-label': 'Pokemon selector' });
  const gridWrap = el('div', { className: 'dex-grid-wrap' }, grid);
  const updateScrollCue = () => {
    const atEnd = grid.scrollTop + grid.clientHeight >= grid.scrollHeight - 4;
    gridWrap.classList.toggle('dex-grid-wrap--more', !atEnd && grid.scrollHeight > grid.clientHeight);
  };
  grid.addEventListener('scroll', updateScrollCue, { passive: true });

  function getVisiblePokemon() {
    const normalizedQuery = normalize(searchQuery);
    return allPokemon.filter((p) => {
      const translated = t(`pokemon.${p.name}`);
      const nameMatch = normalizedQuery === ''
        || normalize(p.name).includes(normalizedQuery)
        || normalize(translated).includes(normalizedQuery);
      const envMatch = envFilter.length === 0 || envFilter.includes(p.environment);
      const m = meta[p.name] || {};
      const sourceMatch = advanced.sources.size === 0 || advanced.sources.has(p.source);
      const regionMatch = !advanced.region || m.region === advanced.region;
      const specialtyMatch = !advanced.specialty || (m.specialties || []).includes(advanced.specialty);
      const underwaterMatch = !advanced.underwater || Boolean(m.underwater);
      return nameMatch && envMatch && sourceMatch && regionMatch && specialtyMatch && underwaterMatch;
    });
  }

  // Advanced filters: source, region, specialty, dive
  function createAdvancedFilters() {
    const details = el('details', { className: 'advanced-filters' },
      el('summary', null, `🔎 ${t('common.advancedFilters')}`)
    );
    const body = el('div', { className: 'advanced-filters__body' });

    // Source chips
    const sourceRow = el('div', { className: 'advanced-filters__row' },
      el('label', null, t('common.filterBySource')));
    for (const [src, icon] of [['base', '🎮'], ['basin', '🧜'], ['event', '🎁']]) {
      const chip = el('button', { type: 'button', className: 'chip', 'aria-pressed': 'false',
        onClick: () => {
          if (advanced.sources.has(src)) advanced.sources.delete(src); else advanced.sources.add(src);
          const on = advanced.sources.has(src);
          chip.classList.toggle('chip--active', on);
          chip.setAttribute('aria-pressed', String(on));
          renderGrid();
        },
      }, `${icon} ${t(`sources.${src}`)}`);
      sourceRow.appendChild(chip);
    }
    body.appendChild(sourceRow);

    // Region select
    const regions = [...new Set(Object.values(meta).map((m) => m.region).filter(Boolean))];
    if (regions.length > 0) {
      const regionSelect = el('select', { className: 'advanced-filters__select', 'aria-label': t('common.filterByRegion') },
        el('option', { value: '' }, t('common.allRegions')));
      for (const r of regions) {
        regionSelect.appendChild(el('option', { value: r }, t(`regions.${r}`) !== `regions.${r}` ? t(`regions.${r}`) : r));
      }
      regionSelect.addEventListener('change', () => { advanced.region = regionSelect.value; renderGrid(); });
      body.appendChild(el('div', { className: 'advanced-filters__row' },
        el('label', null, t('common.region')), regionSelect));
    }

    // Specialty select
    const specialties = [...new Set(Object.values(meta).flatMap((m) => m.specialties || []))].sort();
    if (specialties.length > 0) {
      const specSelect = el('select', { className: 'advanced-filters__select', 'aria-label': t('common.filterBySpecialty') },
        el('option', { value: '' }, t('common.allSpecialties')));
      for (const sp of specialties) specSelect.appendChild(el('option', { value: sp }, sp));
      specSelect.addEventListener('change', () => { advanced.specialty = specSelect.value; renderGrid(); });
      body.appendChild(el('div', { className: 'advanced-filters__row' },
        el('label', null, t('common.specialty')), specSelect));
    }

    // Underwater toggle
    const diveChip = el('button', { type: 'button', className: 'chip', 'aria-pressed': 'false',
      onClick: () => {
        advanced.underwater = !advanced.underwater;
        diveChip.classList.toggle('chip--active', advanced.underwater);
        diveChip.setAttribute('aria-pressed', String(advanced.underwater));
        renderGrid();
      },
    }, `🤿 ${t('common.underwater')}`);
    body.appendChild(el('div', { className: 'advanced-filters__row' }, diveChip));

    details.appendChild(body);
    return details;
  }

  function renderGrid() {
    grid.innerHTML = '';
    const visible = getVisiblePokemon();
    const selected = store.getState().selectedPokemon;
    searchBar.setCount(visible.length, allPokemon.length);

    if (visible.length === 0) {
      grid.appendChild(el('div', { className: 'dex-grid__empty' },
        el('span', { className: 'dex-grid__empty-icon', 'aria-hidden': 'true' }, '🫥'),
        el('span', null, t('common.noResults'))
      ));
      requestAnimationFrame(updateScrollCue);
      return;
    }

    for (const pokemon of visible) {
      const isChecked = selected instanceof Set ? selected.has(pokemon.name) : false;
      const envColor = ENV_COLORS[pokemon.environment] || '#95a5a6';
      const url = spriteUrl(pokemon.name);
      const translatedName = t(`pokemon.${pokemon.name}`) !== `pokemon.${pokemon.name}`
        ? t(`pokemon.${pokemon.name}`) : pokemon.name;

      // Sprite image or fallback text
      const spriteEl = url
        ? el('img', {
            src: url,
            alt: translatedName,
            className: 'dex-cell__sprite',
            loading: 'lazy',
            width: '48',
            height: '48',
          })
        : el('span', { className: 'dex-cell__fallback' }, pokemon.name.substring(0, 3));

      // Environment dot
      const envDot = el('span', {
        className: 'dex-cell__env',
        style: `background-color: ${envColor}`,
      });

      const cell = el('button', {
        type: 'button',
        className: 'dex-cell' + (isChecked ? ' dex-cell--selected' : ''),
        'data-name': pokemon.name,
        title: translatedName,
        'aria-pressed': String(isChecked),
        'aria-label': translatedName,
        onClick: () => {
          const current = new Set(store.getState().selectedPokemon);
          if (current.has(pokemon.name)) {
            current.delete(pokemon.name);
            cell.classList.remove('dex-cell--selected');
            cell.setAttribute('aria-pressed', 'false');
          } else {
            current.add(pokemon.name);
            cell.classList.add('dex-cell--selected');
            cell.setAttribute('aria-pressed', 'true');
          }
          store.setState({ selectedPokemon: current });
          saveSelection(current);
          updateCount();
        },
      }, spriteEl, envDot);
      if (pokemon.source === 'basin') cell.appendChild(el('span', { className: 'dex-cell__badge', 'aria-hidden': 'true' }, '🧜'));
      else if (pokemon.source === 'event') cell.appendChild(el('span', { className: 'dex-cell__badge', 'aria-hidden': 'true' }, '🎁'));

      grid.appendChild(cell);
    }
    requestAnimationFrame(updateScrollCue);
  }

  // Assemble
  section.appendChild(searchBar);
  section.appendChild(envFilterEl);
  section.appendChild(createAdvancedFilters());
  section.appendChild(actions);
  section.appendChild(gridWrap);

  // Keep cells in sync when the selection is changed elsewhere (share link, import, reset)
  store.subscribe('selectedPokemon', (selected) => {
    const set = selected instanceof Set ? selected : new Set();
    for (const cell of grid.querySelectorAll('.dex-cell')) {
      const on = set.has(cell.getAttribute('data-name'));
      cell.classList.toggle('dex-cell--selected', on);
      cell.setAttribute('aria-pressed', String(on));
    }
    updateCount();
  });

  // Load sprites mapping then render
  loadPokemonIds().then(() => {
    renderGrid();
    updateCount();
  });

  return section;
}
