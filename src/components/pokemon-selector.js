import { el } from '../utils/dom.js';
import { t } from '../core/i18n.js';
import { createSearchBar } from './search-bar.js';
import { createEnvironmentFilter } from './environment-filter.js';

const ENV_COLORS = {
  Lumineux: '#f5c518',
  Sombre: '#6b3fa0',
  Chaud: '#e85d3a',
  Frais: '#5cc5e8',
  Humide: '#3b82d6',
  Sec: '#c2956a',
};

/**
 * Slugifies a Pokemon name to produce a safe HTML id.
 * Handles accented chars, dots, spaces, apostrophes, etc.
 *
 * @param {string} name
 * @returns {string}
 */
function slugify(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Normalizes a string for search comparison:
 * lowercases and strips diacritics.
 *
 * @param {string} str
 * @returns {string}
 */
function normalize(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Creates a Pokemon selector section with search, filter, and styled tiles.
 *
 * @param {Array<{name: string, environment: string, preferences: string[]}>} allPokemon
 * @param {import('../core/store.js').store} store
 * @returns {HTMLElement}
 */
export function createPokemonSelector(allPokemon, store) {
  let searchQuery = '';
  let envFilter = [];

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
    'data-i18n': 'common.selectAll',
    onClick: () => {
      const visible = getVisiblePokemon();
      const current = new Set(store.getState().selectedPokemon);
      for (const p of visible) {
        current.add(p.name);
      }
      store.setState({ selectedPokemon: current });
      renderGrid();
      updateCount();
    },
  }, t('common.selectAll'));

  const clearBtn = el('button', {
    type: 'button',
    className: 'btn btn-ghost btn--sm',
    'data-i18n': 'common.clear',
    onClick: () => {
      store.setState({ selectedPokemon: new Set() });
      renderGrid();
      updateCount();
    },
  }, t('common.clear'));

  const actions = el('div', { className: 'selector-actions' },
    selectAllBtn,
    clearBtn,
    countDisplay
  );

  // Grid container
  const grid = el('div', { className: 'selector-grid' });

  function getVisiblePokemon() {
    const normalizedQuery = normalize(searchQuery);
    return allPokemon.filter((p) => {
      const nameMatch = normalizedQuery === '' ||
        normalize(p.name).includes(normalizedQuery);
      const envMatch = envFilter.length === 0 ||
        envFilter.includes(p.environment);
      return nameMatch && envMatch;
    });
  }

  function renderGrid() {
    grid.innerHTML = '';
    const visible = getVisiblePokemon();
    const selected = store.getState().selectedPokemon;

    for (const pokemon of visible) {
      const isChecked = selected instanceof Set
        ? selected.has(pokemon.name)
        : false;

      const safeId = `sel-${slugify(pokemon.name)}`;
      const envColor = ENV_COLORS[pokemon.environment] || '#95a5a6';
      const translatedEnv = t(`environments.${pokemon.environment}`) !== `environments.${pokemon.environment}`
        ? t(`environments.${pokemon.environment}`)
        : pokemon.environment;

      const checkbox = el('input', {
        type: 'checkbox',
        id: safeId,
        className: 'selector-tile-checkbox',
        'data-pokemon': pokemon.name,
      });
      if (isChecked) {
        checkbox.checked = true;
      }

      const tile = el('div', {
        className: `selector-tile${isChecked ? ' selected' : ''}`,
      },
        checkbox,
        el('span', { className: 'selector-tile-name' }, pokemon.name),
        el('span', {
          className: 'selector-tile-env',
          style: `background-color: ${envColor}`,
          title: translatedEnv,
        })
      );

      checkbox.addEventListener('change', () => {
        const current = new Set(store.getState().selectedPokemon);
        if (checkbox.checked) {
          current.add(pokemon.name);
          tile.classList.add('selected');
        } else {
          current.delete(pokemon.name);
          tile.classList.remove('selected');
        }
        store.setState({ selectedPokemon: current });
        updateCount();
      });

      // Clicking tile also toggles
      tile.addEventListener('click', (e) => {
        if (e.target === checkbox) return;
        checkbox.checked = !checkbox.checked;
        checkbox.dispatchEvent(new Event('change'));
      });

      grid.appendChild(tile);
    }
  }

  // Assemble
  section.appendChild(searchBar);
  section.appendChild(envFilterEl);
  section.appendChild(actions);
  section.appendChild(grid);

  // Initial render
  renderGrid();
  updateCount();

  return section;
}
