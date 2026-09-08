import { el, $ } from '../utils/dom.js';
import { t } from '../core/i18n.js';
import { store } from '../core/store.js';
import { getHashQuery, clearHashQuery } from '../core/router.js';
import { envColor } from '../core/environments.js';
import { createPokemonSelector, saveSelection } from '../components/pokemon-selector.js';
import { createHouseTile } from '../components/house-tile.js';
import { createHouseDetail } from '../components/house-detail.js';
import { createDetailPanel } from '../components/detail-panel.js';
import { createDrawer } from '../components/drawer.js';
import { createEnvironmentFilter } from '../components/environment-filter.js';
import { showMenuPopover } from '../components/pokemon-popover.js';
import { createOptionsPanel, loadOptions, clampSatisfy } from '../components/optimize-options.js';
import { createOwnedItemsPanel, loadUnowned, ownedFrom, saveUnowned } from '../components/owned-items.js';
import { createFirstVisitBanner, createSettingsSummary, createEnvHeading } from '../components/page-bits.js';
import { icon } from '../components/icons.js';
import { optimize } from '../algorithm/optimizer.js';
import {
  loadPlan, savePlan, clearPlan, emptyPlan, normalizePlan, newHouseId,
  resultToPlanHouses, planToEnvironmentHouses, encodeShare, decodeShare,
} from '../core/plan.js';
import { announce } from '../utils/a11y.js';

const MAX_SIZE = 4;

/**
 * "My village": the player's houses as tiles, a detail panel to edit them,
 * and a drawer holding the Pokemon selector and settings.
 */
export function renderPlannerPage() {
  const main = $('#app-main');
  if (!main) return;
  main.innerHTML = '';

  const allPokemon = store.getState().allPokemon || [];
  const byName = new Map(allPokemon.map((p) => [p.name, p]));
  const catalog = store.getState().items || [];
  const options = loadOptions();
  const unowned = loadUnowned();
  let plan = loadPlan();
  let selectedEnvs = [];
  let selectedHouse = null;
  const houseNumbers = new Map();

  // ---- Drawer: selector + settings + tools
  const drawer = createDrawer({ title: t('village.pokemonAndSettings') });
  drawer.body.appendChild(el('section', { className: 'drawer__section', id: 'drawer-pokemon' },
    el('h3', { className: 'drawer__section-title' }, t('village.addPokemon')),
    createPokemonSelector(allPokemon, store)
  ));
  const optimizeBtn = el('button', { type: 'button', className: 'btn btn-primary btn--lg optimize-btn', onClick: () => runOptimization() },
    icon('house', { size: 20, color: '#fff' }), ` ${t('common.optimize')}`);
  drawer.body.appendChild(el('section', { className: 'drawer__section', id: 'drawer-settings' },
    el('h3', { className: 'drawer__section-title' }, t('settings.title')),
    createOptionsPanel(options, () => { refreshSummary(); render(); }, { showSources: false }),
    catalog.length > 0 ? createOwnedItemsPanel(catalog, unowned, () => render()) : null
  ));
  const ownedPanel = drawer.body.querySelector('.owned-items');

  const fileInput = el('input', { type: 'file', accept: 'application/json,.json', className: 'sr-only', tabindex: '-1' });
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    fileInput.value = '';
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      applyState({ selected: data.selected, plan: normalizePlan(data.plan), options: data.options });
      toast(t('planner.planRestored'));
    } catch { toast(t('planner.importError'), true); }
  });
  drawer.body.appendChild(el('section', { className: 'drawer__section', id: 'drawer-tools' },
    el('h3', { className: 'drawer__section-title' }, t('village.tools')),
    el('p', { className: 'options-panel__hint' }, t('village.saved')),
    el('div', { className: 'drawer__tools' },
      el('button', { type: 'button', className: 'btn btn-secondary btn--sm', onClick: shareLink }, icon('share', { size: 14 }), ` ${t('planner.share')}`),
      el('button', { type: 'button', className: 'btn btn-ghost btn--sm', onClick: exportJson }, icon('download', { size: 14 }), ` ${t('planner.export')}`),
      el('button', { type: 'button', className: 'btn btn-ghost btn--sm', onClick: () => fileInput.click() }, icon('upload', { size: 14 }), ` ${t('planner.import')}`),
      el('button', { type: 'button', className: 'btn btn-ghost btn--sm', onClick: resetAll }, icon('trash', { size: 14 }), ` ${t('planner.reset')}`),
      fileInput
    )
  ));
  drawer.body.appendChild(el('div', { className: 'drawer__footer' }, optimizeBtn));
  main.appendChild(drawer.el);

  // ---- Header
  const summaryText = el('p', { className: 'page-header__tagline' });
  main.appendChild(el('div', { className: 'page-header page-header--village' },
    el('div', null, el('h1', null, t('village.title')), summaryText),
    el('div', { className: 'page-header__actions' },
      el('button', { type: 'button', className: 'btn btn-primary', onClick: () => drawer.open('#drawer-pokemon .search-bar') }, icon('plus', { size: 18, color: '#fff' }), ` ${t('village.addPokemon')}`),
      el('button', { type: 'button', className: 'btn btn-secondary', onClick: () => drawer.open('#drawer-settings') }, icon('sliders', { size: 18 }), ` ${t('settings.title')}`)
    )
  ));

  let summary = createSettingsSummary(options, () => drawer.open('#drawer-settings'), { showSources: false });
  const summarySlot = el('div', null, summary);
  main.appendChild(summarySlot);
  function refreshSummary() {
    const fresh = createSettingsSummary(options, () => drawer.open('#drawer-settings'), { showSources: false });
    summarySlot.replaceChild(fresh, summary);
    summary = fresh;
  }

  const banner = createFirstVisitBanner('village');
  if (banner) main.appendChild(banner);

  const notice = el('div', { className: 'village-notice', hidden: '' });
  main.appendChild(notice);

  const filters = el('div', { className: 'village-filters' }, createEnvironmentFilter((envs) => { selectedEnvs = envs; render(); }));
  main.appendChild(filters);

  const tilesArea = el('div', { className: 'village-tiles' });
  const panel = createDetailPanel({ onClose: () => { selectedHouse = null; markSelected(); } });
  main.appendChild(el('div', { className: 'village-layout' }, tilesArea, panel.el));

  // ---- State helpers
  function selectedNames() {
    const s = store.getState().selectedPokemon;
    return s instanceof Set ? [...s].filter((n) => byName.has(n)) : [];
  }
  function persist() { savePlan(plan); render(); }
  function applyState({ selected, plan: newPlan, options: newOptions }) {
    if (Array.isArray(selected)) {
      const set = new Set(selected.filter((n) => byName.has(n)));
      store.setState({ selectedPokemon: set });
      saveSelection(set);
    }
    if (newPlan) plan = newPlan;
    if (newOptions && newOptions.satisfy !== undefined) { options.satisfy = clampSatisfy(newOptions.satisfy); refreshSummary(); }
    persist();
  }
  function planMemberNames() {
    const set = new Set();
    for (const h of plan.houses) for (const m of h.members) set.add(m);
    return set;
  }
  function pruneToSelection() {
    const selected = new Set(selectedNames());
    let changed = false;
    for (const h of plan.houses) {
      const kept = h.members.filter((m) => selected.has(m));
      if (kept.length !== h.members.length) { h.members = kept; changed = true; }
    }
    const before = plan.houses.length;
    plan.houses = plan.houses.filter((h) => h.members.length > 0);
    return changed || plan.houses.length !== before;
  }

  // ---- Optimization (keeps locked houses)
  function runOptimization() {
    const names = selectedNames();
    if (names.length < 1) { toast(t('planner.selectPrompt'), true); return; }
    pruneToSelection();
    const lockedPlanHouses = plan.houses.filter((h) => h.locked);
    const lockedHouses = lockedPlanHouses.map((h) => ({ members: h.members.map((n) => byName.get(n)) }));
    optimizeBtn.disabled = true;
    setTimeout(() => {
      const result = optimize(names.map((n) => byName.get(n)), { satisfy: options.satisfy, lockedHouses });
      plan.houses = resultToPlanHouses(result, lockedPlanHouses);
      optimizeBtn.disabled = false;
      drawer.close();
      panel.close();
      persist();
      announce(t('a11y.resultsUpdated').replace('{count}', String(result.totalHouses)));
      tilesArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 30);
  }

  // ---- Editing
  function moveMember(name, fromId, toId) {
    const from = plan.houses.find((h) => h.id === fromId);
    let to = plan.houses.find((h) => h.id === toId);
    if (!from) return;
    if (to && (to.locked || to.members.length >= MAX_SIZE)) return;
    from.members = from.members.filter((m) => m !== name);
    if (!to) { to = { id: toId || newHouseId(), members: [], locked: false }; plan.houses.push(to); }
    to.members.push(name);
    plan.houses = plan.houses.filter((h) => h.members.length > 0);
    if (!plan.houses.some((h) => h.id === selectedHouse)) selectedHouse = to.id;
    persist();
  }
  function openMoveMenu(name, house, anchor) {
    const env = byName.get(name)?.environment;
    const tn = (n) => (t(`pokemon.${n}`) !== `pokemon.${n}` ? t(`pokemon.${n}`) : n);
    const items = [];
    for (const h of plan.houses) {
      if (h.id === house.id) continue;
      const first = byName.get(h.members[0]);
      if (!first || first.environment !== env) continue;
      const full = h.members.length >= MAX_SIZE;
      const label = `${t('common.house')} ${houseNumbers.get(h.id) ?? '?'} (${h.members.length}/${MAX_SIZE})` + (h.locked ? ' 🔒' : full ? ` – ${t('planner.full')}` : '');
      items.push({ label, disabled: full || h.locked, onSelect: () => moveMember(name, house.id, h.id) });
    }
    items.push({ label: `+ ${t('planner.newHouse')}`, onSelect: () => moveMember(name, house.id, null) });
    showMenuPopover(anchor, `${t('planner.moveTo')} – ${tn(name)}`, items);
  }
  function toggleLock(house) {
    const h = plan.houses.find((x) => x.id === house.id);
    if (!h) return;
    h.locked = !h.locked;
    persist();
  }
  function removeMember(name) {
    const set = new Set(store.getState().selectedPokemon);
    set.delete(name);
    store.setState({ selectedPokemon: set });
    saveSelection(set);
  }
  function toggleOwned(slug, isOwned) {
    if (isOwned) unowned.delete(slug); else unowned.add(slug);
    saveUnowned(unowned);
    if (ownedPanel && ownedPanel.refresh) ownedPanel.refresh();
    render();
  }

  // ---- Share / export / reset
  async function shareLink() {
    const token = await encodeShare({ selected: selectedNames(), plan, options: { satisfy: options.satisfy } });
    const url = `${location.origin}${location.pathname}#/planner?p=${token}`;
    try { await navigator.clipboard.writeText(url); toast(t('planner.copied')); }
    catch { window.prompt('URL', url); }
  }
  function exportJson() {
    const data = { version: 1, exportedAt: new Date().toISOString(), selected: selectedNames(), plan, options: { satisfy: options.satisfy } };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = el('a', { href: URL.createObjectURL(blob), download: 'pokopia-village.json' });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  function resetAll() {
    if (!window.confirm(t('planner.resetConfirm'))) return;
    plan = emptyPlan();
    clearPlan();
    const empty = new Set();
    store.setState({ selectedPokemon: empty });
    saveSelection(empty);
    drawer.close();
    render();
  }
  function toast(message, isError = false) {
    const node = el('div', { className: 'toast' + (isError ? ' toast--error' : ''), role: 'status' }, message);
    document.body.appendChild(node);
    setTimeout(() => node.classList.add('toast--visible'), 10);
    setTimeout(() => { node.classList.remove('toast--visible'); setTimeout(() => node.remove(), 300); }, 2500);
  }

  // ---- Rendering
  function detailOptions() {
    return {
      editable: true, items: catalog, owned: ownedFrom(catalog, unowned),
      onToggleLock: toggleLock, onMove: openMoveMenu, onRemoveMember: removeMember, onToggleOwned: toggleOwned,
    };
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
    panel.open(createHouseDetail(house, houseNumbers.get(house.id), detailOptions()));
  }

  function render() {
    tilesArea.innerHTML = '';
    houseNumbers.clear();
    const selected = selectedNames();
    const placed = planMemberNames();
    const unplaced = selected.filter((n) => !placed.has(n));

    const groups = planToEnvironmentHouses(plan, byName, options.satisfy);
    let totalHouses = 0, totalPokemon = 0, items = 0;
    for (const houses of Object.values(groups)) for (const h of houses) { totalHouses++; totalPokemon += h.members.length; items += h.cost; }
    summaryText.textContent = totalHouses > 0
      ? t('village.summary').replace('{p}', totalPokemon).replace('{h}', totalHouses).replace('{i}', items)
      : t('village.emptyText');

    if (unplaced.length > 0) {
      notice.hidden = false;
      notice.innerHTML = '';
      notice.append(
        el('span', null, t('village.unplacedShort').replace('{n}', unplaced.length)),
        el('button', { type: 'button', className: 'btn btn-primary btn--sm', onClick: runOptimization }, `${t('village.optimizeNow')}`)
      );
    } else notice.hidden = true;

    if (plan.houses.length === 0) {
      panel.close();
      filters.hidden = true;
      tilesArea.appendChild(el('div', { className: 'village-empty' },
        el('span', { className: 'village-empty__icon' }, icon('house', { size: 48, color: '#E3350D' })),
        el('h2', null, t('village.emptyTitle')),
        el('p', null, t('village.emptyText')),
        el('button', { type: 'button', className: 'btn btn-primary btn--lg', onClick: () => drawer.open('#drawer-pokemon .search-bar') }, icon('plus', { size: 20, color: '#fff' }), ` ${t('village.addPokemon')}`)
      ));
      return;
    }
    filters.hidden = false;

    let index = 1;
    let current = null;
    for (const [envName, houses] of Object.entries(groups)) {
      const numbered = houses.map((h) => { houseNumbers.set(h.id, index++); return h; });
      if (selectedEnvs.length > 0 && !selectedEnvs.includes(envName)) continue;
      const translatedEnv = t(`environments.${envName}`) !== `environments.${envName}` ? t(`environments.${envName}`) : envName;
      const section = el('section', { className: 'env-section' },
        createEnvHeading(envName, translatedEnv, `${houses.length} ${t('stats.housesShort')}`, envColor(envName))
      );
      const grid = el('div', { className: 'tile-grid' });
      for (const house of numbered) {
        if (house.id === selectedHouse) current = house;
        grid.appendChild(createHouseTile(house, houseNumbers.get(house.id), { selected: selectedHouse === house.id, onSelect: openHouse }));
      }
      section.appendChild(grid);
      tilesArea.appendChild(section);
    }
    tilesArea.appendChild(el('p', { className: 'village-tile-hint' }, t('village.tileHint')));

    // Keep the open detail in sync with the edited plan
    if (selectedHouse) {
      if (current) panel.update(createHouseDetail(current, houseNumbers.get(current.id), detailOptions()));
      else { selectedHouse = null; panel.close(); }
    }
  }

  store.subscribe('selectedPokemon', () => {
    if (pruneToSelection()) savePlan(plan);
    render();
  });

  const token = getHashQuery().get('p');
  if (token) {
    decodeShare(token).then((state) => {
      clearHashQuery();
      if (state) { applyState(state); toast(t('planner.planRestored')); }
      else toast(t('planner.importError'), true);
    });
  } else {
    pruneToSelection();
    render();
  }
}
