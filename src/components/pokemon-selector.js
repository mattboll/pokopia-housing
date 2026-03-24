import { el } from '../utils/dom.js';
import { t } from '../core/i18n.js';
import { createSearchBar } from './search-bar.js';
import { createEnvironmentFilter } from './environment-filter.js';

const ENV_COLORS = {
  Lumineux: '#f5c518', Sombre: '#6b3fa0', Chaud: '#e85d3a',
  Frais: '#5cc5e8', Humide: '#3b82d6', Sec: '#c2956a',
};

const SPRITE_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/';
const STORAGE_KEY = 'pokopia-housing-selected';

/** @type {Record<string, number> | null} */
let pokemonIds = null;

/**
 * Loads the pokemon name → national dex ID mapping.
 */
async function loadPokemonIds() {
  if (pokemonIds) return;
  try {
    const base = import.meta.env.BASE_URL ?? '/pokopia-housing/';
    const resp = await fetch(`${base}data/pokemon-ids.json`);
    pokemonIds = await resp.json();
  } catch (e) {
    console.warn('Could not load pokemon IDs for sprites', e);
    pokemonIds = {};
  }
}

/**
 * Returns the sprite URL for a pokemon name.
 */
function spriteUrl(name) {
  const id = pokemonIds?.[name];
  if (!id) return null;
  return `${SPRITE_BASE}${id}.png`;
}

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
function saveSelection(selected) {
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

  // Grid container — Pokedex style
  const grid = el('div', { className: 'dex-grid', role: 'grid', 'aria-label': 'Pokemon selector' });

  function getVisiblePokemon() {
    const normalizedQuery = normalize(searchQuery);
    return allPokemon.filter((p) => {
      const nameMatch = normalizedQuery === '' || normalize(p.name).includes(normalizedQuery);
      const envMatch = envFilter.length === 0 || envFilter.includes(p.environment);
      return nameMatch && envMatch;
    });
  }

  function renderGrid() {
    grid.innerHTML = '';
    const visible = getVisiblePokemon();
    const selected = store.getState().selectedPokemon;

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

      grid.appendChild(cell);
    }
  }

  // Assemble
  section.appendChild(searchBar);
  section.appendChild(envFilterEl);
  section.appendChild(actions);
  section.appendChild(grid);

  // Load sprites mapping then render
  loadPokemonIds().then(() => {
    renderGrid();
    updateCount();
  });

  return section;
}
