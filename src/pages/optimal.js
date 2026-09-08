import { el, $ } from '../utils/dom.js';
import { t } from '../core/i18n.js';
import { store } from '../core/store.js';
import { envColor } from '../core/environments.js';
import { optimize } from '../algorithm/optimizer.js';
import { createHouseTile } from '../components/house-tile.js';
import { createHouseDetail } from '../components/house-detail.js';
import { createDetailPanel } from '../components/detail-panel.js';
import { createEnvironmentFilter } from '../components/environment-filter.js';
import { createOptionsPanel, loadOptions, applySourceFilter } from '../components/optimize-options.js';
import { createFirstVisitBanner, createStatTiles, createSettingsSummary, createEnvHeading } from '../components/page-bits.js';
import { icon } from '../components/icons.js';
import { announce } from '../utils/a11y.js';

function normalize(str) {
  return str.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/**
 * Optimal housing page: every Pokemon in the game, as house tiles.
 * Computed in the browser so the DLC / event toggles and the "favorites to
 * satisfy" setting apply.
 */
export function renderOptimalPage() {
  const main = $('#app-main');
  if (!main) return;
  main.innerHTML = '';

  const allPokemon = store.getState().allPokemon || [];
  const catalog = store.getState().items || [];
  const options = loadOptions();
  let result = null;
  let selectedEnvs = [];
  let query = '';
  let selectedHouse = null;

  // ---- Header
  main.appendChild(el('div', { className: 'page-header page-header--village' },
    el('div', null,
      el('h1', null, t('optimal.title')),
      el('p', { className: 'page-header__tagline' }, t('optimal.tagline'), ' ',
        el('span', { className: 'page-header__cta' }, `${t('optimal.notAll')} `, el('a', { href: '#/planner' }, t('optimal.makeVillage'))))
    )
  ));

  // ---- Settings summary + collapsible options
  const optionsWrap = el('div', { className: 'options-collapsible', hidden: '' });
  let summary = createSettingsSummary(options, toggleOptions);
  const summarySlot = el('div', null, summary);
  optionsWrap.appendChild(createOptionsPanel(options, () => { refreshSummary(); compute(); }));
  main.appendChild(summarySlot);
  main.appendChild(optionsWrap);

  function toggleOptions() {
    optionsWrap.hidden = !optionsWrap.hidden;
    summary.setAttribute('aria-expanded', String(!optionsWrap.hidden));
  }
  function refreshSummary() {
    const fresh = createSettingsSummary(options, toggleOptions);
    fresh.setAttribute('aria-expanded', String(!optionsWrap.hidden));
    summarySlot.replaceChild(fresh, summary);
    summary = fresh;
  }

  // ---- Stats, first visit, filters
  const statsSlot = el('div');
  main.appendChild(statsSlot);
  const banner = createFirstVisitBanner('optimal');
  if (banner) main.appendChild(banner);

  const search = el('input', { type: 'search', className: 'input village-search', placeholder: t('village.findPokemon'), 'aria-label': t('village.findPokemon') });
  search.addEventListener('input', () => { query = normalize(search.value.trim()); renderTiles(); });
  const filters = el('div', { className: 'village-filters' },
    createEnvironmentFilter((envs) => { selectedEnvs = envs; renderTiles(); }),
    el('div', { className: 'village-search-wrap' }, icon('search', { size: 16, className: 'village-search__icon' }), search)
  );
  main.appendChild(filters);
  main.appendChild(el('p', { className: 'village-tile-hint' }, t('village.tileHint')));

  // ---- Layout: tiles + detail panel
  const tilesArea = el('div', { className: 'village-tiles' });
  const panel = createDetailPanel({ onClose: () => { selectedHouse = null; markSelected(); } });
  main.appendChild(el('div', { className: 'village-layout' }, tilesArea, panel.el));

  function compute() {
    panel.close();
    tilesArea.innerHTML = '';
    tilesArea.appendChild(el('div', { className: 'loading-state' }, el('span', { className: 'loading-spinner' }), el('p', null, t('common.computing'))));
    setTimeout(() => {
      const list = applySourceFilter(allPokemon, options);
      result = optimize(list, { satisfy: options.satisfy });
      let n = 1;
      for (const group of Object.values(result.environmentGroups)) {
        for (const h of group.houses) { h.id = `o${n}`; h.index = n; n++; }
      }
      statsSlot.innerHTML = '';
      statsSlot.appendChild(createStatTiles(result));
      renderTiles();
      announce(t('a11y.resultsUpdated').replace('{count}', String(result.totalHouses)));
    }, 30);
  }

  function matches(house) {
    if (!query) return true;
    return house.members.some((m) => normalize(m.name).includes(query) || normalize(t(`pokemon.${m.name}`)).includes(query));
  }

  function renderTiles() {
    tilesArea.innerHTML = '';
    if (!result) return;
    for (const [envName, group] of Object.entries(result.environmentGroups)) {
      if (selectedEnvs.length > 0 && !selectedEnvs.includes(envName)) continue;
      const houses = group.houses.filter(matches);
      if (houses.length === 0) continue;
      const translatedEnv = t(`environments.${envName}`) !== `environments.${envName}` ? t(`environments.${envName}`) : envName;
      const section = el('section', { className: 'env-section' },
        createEnvHeading(envName, translatedEnv, `${group.houseCount} ${t('stats.housesShort')} · ${group.pokemonCount} Pokémon`, envColor(envName))
      );
      const grid = el('div', { className: 'tile-grid' });
      for (const house of houses) {
        grid.appendChild(createHouseTile(house, house.index, { selected: selectedHouse === house.id, onSelect: openHouse }));
      }
      section.appendChild(grid);
      tilesArea.appendChild(section);
    }
    if (tilesArea.children.length === 0) {
      tilesArea.appendChild(el('p', { className: 'village-empty-filter' }, t('common.noResults')));
    }
  }

  function markSelected() {
    for (const tile of tilesArea.querySelectorAll('.house-tile')) {
      const on = tile.getAttribute('data-house-id') === selectedHouse;
      tile.classList.toggle('house-tile--selected', on);
      tile.setAttribute('aria-pressed', String(on));
    }
  }

  function openHouse(house) {
    selectedHouse = house.id;
    markSelected();
    panel.open(createHouseDetail(house, house.index, { items: catalog, owned: null }));
  }

  compute();
}
