import { el, $ } from '../utils/dom.js';
import { t } from '../core/i18n.js';
import { store } from '../core/store.js';
import { getHashQuery, clearHashQuery } from '../core/router.js';
import { createPokemonSelector, saveSelection } from '../components/pokemon-selector.js';
import { createHouseCard, getDragging } from '../components/house-card.js';
import { showMenuPopover } from '../components/pokemon-popover.js';
import { createOptionsPanel, loadOptions, clampSatisfy } from '../components/optimize-options.js';
import { createStatsSummary } from '../components/stats-summary.js';
import { optimize } from '../algorithm/optimizer.js';
import {
  loadPlan, savePlan, clearPlan, emptyPlan, normalizePlan, newHouseId,
  resultToPlanHouses, planToEnvironmentHouses, encodeShare, decodeShare,
} from '../core/plan.js';
import { announce } from '../utils/a11y.js';

const ENV_EMOJI = {
  Lumineux: '☀️', Sombre: '🌙', Chaud: '🔥',
  Frais: '❄️', Humide: '💧', Sec: '🏜️',
};

const ENV_COLORS = {
  Lumineux: '#f5c518', Sombre: '#6b3fa0', Chaud: '#e85d3a',
  Frais: '#5cc5e8', Humide: '#3b82d6', Sec: '#c2956a',
};

const MAX_SIZE = 4;

/**
 * Renders the Custom Planner page into #app-main.
 * Left panel: Pokemon selector. Right panel: "my village" (editable houses).
 */
export function renderPlannerPage() {
  const main = $('#app-main');
  if (!main) return;

  main.innerHTML = '';

  main.appendChild(el('div', { className: 'page-header' },
    el('h1', { 'data-i18n': 'planner.title' }, t('planner.title')),
    el('p', { 'data-i18n': 'planner.description' }, t('planner.description'))
  ));

  const allPokemon = store.getState().allPokemon || [];
  const byName = new Map(allPokemon.map((p) => [p.name, p]));
  const options = loadOptions();
  let plan = loadPlan();

  const layout = el('div', { className: 'planner-layout' });

  // ---- Left panel: selector + options + optimize button
  const leftPanel = el('div', { className: 'planner-panel planner-panel-left' });
  leftPanel.appendChild(createPokemonSelector(allPokemon, store));
  leftPanel.appendChild(createOptionsPanel(options, () => render(), { showSources: false }));

  const optimizeBtn = el('button', {
    type: 'button',
    className: 'btn btn-primary btn--lg optimize-btn',
    onClick: () => runOptimization(),
  }, '🏠 ' + t('common.optimize'));
  leftPanel.appendChild(optimizeBtn);

  // ---- Right panel: my village
  const rightPanel = el('div', { className: 'planner-panel planner-panel-right' });
  const toolbar = el('div', { className: 'village-toolbar' });
  const statsSlot = el('div');
  const notice = el('div', { className: 'village-notice', hidden: '' });
  const resultsArea = el('div', { className: 'planner-results' });
  rightPanel.append(toolbar, statsSlot, notice, resultsArea);

  layout.append(leftPanel, rightPanel);
  main.appendChild(layout);

  // Desktop: the left panel is sticky and scrolls internally. Size it to the
  // space actually left under its current top edge so the Optimize button
  // (sticky at the panel's bottom) is always on screen.
  const desktop = window.matchMedia('(min-width: 768px)');
  function fitLeftPanel() {
    if (!document.body.contains(leftPanel)) {
      window.removeEventListener('scroll', fitLeftPanel);
      window.removeEventListener('resize', fitLeftPanel);
      return;
    }
    if (!desktop.matches) { leftPanel.style.maxHeight = ''; return; }
    const stickyTop = parseFloat(getComputedStyle(leftPanel).top) || 80;
    const top = Math.max(stickyTop, leftPanel.getBoundingClientRect().top);
    leftPanel.style.maxHeight = `${Math.max(320, window.innerHeight - top - 16)}px`;
  }
  window.addEventListener('scroll', fitLeftPanel, { passive: true });
  window.addEventListener('resize', fitLeftPanel);
  requestAnimationFrame(fitLeftPanel);

  // ---- Toolbar actions
  const fileInput = el('input', { type: 'file', accept: 'application/json,.json', className: 'sr-only', tabindex: '-1' });
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    fileInput.value = '';
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      applyState({ selected: data.selected, plan: normalizePlan(data.plan), options: data.options });
      toast(t('planner.planRestored'));
    } catch {
      toast(t('planner.importError'), true);
    }
  });

  toolbar.append(
    el('h2', { className: 'village-toolbar__title' }, `🏡 ${t('planner.myVillage')}`),
    el('span', { className: 'village-toolbar__saved' }, `💾 ${t('planner.savedLocally')}`),
    el('div', { className: 'village-toolbar__actions' },
      el('button', { type: 'button', className: 'btn btn-secondary btn--sm', onClick: shareLink }, `🔗 ${t('planner.share')}`),
      el('button', { type: 'button', className: 'btn btn-ghost btn--sm', onClick: exportJson }, `⬇️ ${t('planner.export')}`),
      el('button', { type: 'button', className: 'btn btn-ghost btn--sm', onClick: () => fileInput.click() }, `⬆️ ${t('planner.import')}`),
      el('button', { type: 'button', className: 'btn btn-ghost btn--sm', onClick: resetAll }, `🗑️ ${t('planner.reset')}`),
      fileInput
    )
  );

  // ---- State helpers
  function selectedNames() {
    const s = store.getState().selectedPokemon;
    return s instanceof Set ? [...s].filter((n) => byName.has(n)) : [];
  }

  function persist() {
    savePlan(plan);
    render();
  }

  function applyState({ selected, plan: newPlan, options: newOptions }) {
    if (Array.isArray(selected)) {
      const set = new Set(selected.filter((n) => byName.has(n)));
      store.setState({ selectedPokemon: set });
      saveSelection(set);
    }
    if (newPlan) plan = newPlan;
    if (newOptions && newOptions.satisfy !== undefined) options.satisfy = clampSatisfy(newOptions.satisfy);
    persist();
  }

  function planMemberNames() {
    const set = new Set();
    for (const h of plan.houses) for (const m of h.members) set.add(m);
    return set;
  }

  /** Drop from the plan any Pokemon no longer selected, drop empty houses. */
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
    if (names.length < 1) {
      resultsArea.innerHTML = '';
      resultsArea.appendChild(el('div', { className: 'planner-empty-state' },
        el('span', { className: 'planner-empty-icon' }, '⚠️'),
        el('p', { className: 'planner-empty-title' }, t('planner.selectPrompt'))
      ));
      return;
    }

    pruneToSelection();
    const lockedPlanHouses = plan.houses.filter((h) => h.locked);
    const lockedHouses = lockedPlanHouses.map((h) => ({ members: h.members.map((n) => byName.get(n)) }));

    optimizeBtn.disabled = true;
    resultsArea.innerHTML = '';
    resultsArea.appendChild(el('div', { className: 'loading-state' },
      el('span', { className: 'loading-spinner' }),
      el('p', null, t('common.computing'))
    ));

    setTimeout(() => {
      const list = names.map((n) => byName.get(n));
      const result = optimize(list, { satisfy: options.satisfy, lockedHouses });
      plan.houses = resultToPlanHouses(result, lockedPlanHouses);
      optimizeBtn.disabled = false;
      persist();
      announce(t('a11y.resultsUpdated').replace('{count}', String(result.totalHouses)));
      // On narrow screens the results are below the selector: bring them into view
      if (window.matchMedia('(max-width: 767px)').matches) {
        rightPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 30);
  }

  // ---- Editing
  function moveMember(name, fromId, toId) {
    const from = plan.houses.find((h) => h.id === fromId);
    let to = plan.houses.find((h) => h.id === toId);
    if (!from) return;
    if (to && (to.locked || to.members.length >= MAX_SIZE)) return;
    from.members = from.members.filter((m) => m !== name);
    if (!to) {
      to = { id: toId || newHouseId(), members: [], locked: false };
      plan.houses.push(to);
    }
    to.members.push(name);
    plan.houses = plan.houses.filter((h) => h.members.length > 0);
    persist();
  }

  function openMoveMenu(name, house, anchor) {
    const env = byName.get(name)?.environment;
    const items = [];
    plan.houses.forEach((h) => {
      if (h.id === house.id) return;
      const first = byName.get(h.members[0]);
      if (!first || first.environment !== env) return;
      const full = h.members.length >= MAX_SIZE;
      const label = `${t('common.house')} #${houseNumbers.get(h.id) ?? '?'} (${h.members.length}/${MAX_SIZE})`
        + (h.locked ? ' 🔒' : full ? ` – ${t('planner.full')}` : '');
      items.push({ label, disabled: full || h.locked, onSelect: () => moveMember(name, house.id, h.id) });
    });
    items.push({ label: `➕ ${t('planner.newHouse')}`, onSelect: () => moveMember(name, house.id, null) });
    showMenuPopover(anchor, `${t('planner.moveTo')} – ${t(`pokemon.${name}`) !== `pokemon.${name}` ? t(`pokemon.${name}`) : name}`, items);
  }

  function toggleLock(house) {
    const h = plan.houses.find((x) => x.id === house.id);
    if (!h) return;
    h.locked = !h.locked;
    persist();
  }

  // ---- Share / export / reset
  async function shareLink() {
    const token = await encodeShare({ selected: selectedNames(), plan, options: { satisfy: options.satisfy } });
    const url = `${location.origin}${location.pathname}#/planner?p=${token}`;
    try {
      await navigator.clipboard.writeText(url);
      toast(t('planner.copied'));
    } catch {
      window.prompt('URL', url);
    }
  }

  function exportJson() {
    const data = { version: 1, exportedAt: new Date().toISOString(), selected: selectedNames(), plan, options: { satisfy: options.satisfy } };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = el('a', { href: URL.createObjectURL(blob), download: 'pokopia-village.json' });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  function resetAll() {
    if (!window.confirm(t('planner.resetConfirm'))) return;
    plan = emptyPlan();
    clearPlan();
    const empty = new Set();
    store.setState({ selectedPokemon: empty });
    saveSelection(empty);
    render();
  }

  function toast(message, isError = false) {
    const node = el('div', { className: 'toast' + (isError ? ' toast--error' : ''), role: 'status' }, message);
    document.body.appendChild(node);
    setTimeout(() => node.classList.add('toast--visible'), 10);
    setTimeout(() => { node.classList.remove('toast--visible'); setTimeout(() => node.remove(), 300); }, 2500);
  }

  // ---- Rendering
  const houseNumbers = new Map();

  function render() {
    resultsArea.innerHTML = '';
    statsSlot.innerHTML = '';
    houseNumbers.clear();

    const selected = selectedNames();
    const placed = planMemberNames();
    const unplaced = selected.filter((n) => !placed.has(n));

    if (plan.houses.length === 0) {
      notice.hidden = true;
      resultsArea.appendChild(el('div', { className: 'planner-empty-state' },
        el('span', { className: 'planner-empty-icon' }, '🏠'),
        el('p', { className: 'planner-empty-title' }, t('planner.emptyState')),
        el('p', { className: 'planner-empty-hint' }, t('planner.selectPrompt'))
      ));
      return;
    }

    // Unplaced notice
    if (unplaced.length > 0) {
      notice.hidden = false;
      notice.innerHTML = '';
      notice.append(
        el('strong', null, `⚠️ ${t('planner.unplaced')} (${unplaced.length}) : `),
        el('span', null, unplaced.map((n) => (t(`pokemon.${n}`) !== `pokemon.${n}` ? t(`pokemon.${n}`) : n)).join(', ')),
        el('button', { type: 'button', className: 'btn btn-secondary btn--sm', onClick: runOptimization }, `🔁 ${t('planner.reoptimize')}`)
      );
    } else {
      notice.hidden = true;
    }

    const groups = planToEnvironmentHouses(plan, byName, options.satisfy);
    const summary = summarize(groups);
    statsSlot.appendChild(createStatsSummary(summary));
    statsSlot.appendChild(el('p', { className: 'village-hint' }, `💡 ${t('planner.dragHint')}`));

    let index = 1;
    for (const [envName, houses] of Object.entries(groups)) {
      const translatedEnv = t(`environments.${envName}`) !== `environments.${envName}` ? t(`environments.${envName}`) : envName;
      const emoji = ENV_EMOJI[envName] || '🏠';
      const color = ENV_COLORS[envName] || '#95a5a6';

      const section = el('section', { className: 'env-section' },
        el('h2', {
          className: 'env-section-heading',
          style: `border-left: 4px solid ${color}; padding-left: var(--space-3); color: ${color}`,
        }, `${emoji} ${translatedEnv} (${houses.length} ${t('common.houses')})`)
      );

      const grid = el('div', { className: 'houses-grid' });
      for (const house of houses) {
        houseNumbers.set(house.id, index);
        grid.appendChild(createHouseCard(house, index, {
          editable: true,
          onToggleLock: toggleLock,
          onMove: openMoveMenu,
          onDrop: (name, fromId, target) => moveMember(name, fromId, target.id),
        }));
        index++;
      }
      grid.appendChild(createNewHouseZone(envName));
      section.appendChild(grid);
      resultsArea.appendChild(section);
    }
  }

  function createNewHouseZone(envName) {
    const zone = el('div', { className: 'new-house-zone', 'aria-label': t('planner.newHouse') },
      el('span', null, `➕ ${t('planner.newHouse')}`)
    );
    zone.addEventListener('dragover', (e) => {
      const d = getDragging();
      if (!d || d.environment !== envName) return;
      e.preventDefault();
      zone.classList.add('new-house-zone--active');
    });
    zone.addEventListener('dragleave', () => zone.classList.remove('new-house-zone--active'));
    zone.addEventListener('drop', (e) => {
      zone.classList.remove('new-house-zone--active');
      const d = getDragging();
      if (!d || d.environment !== envName) return;
      e.preventDefault();
      moveMember(d.name, d.fromId, null);
    });
    return zone;
  }

  function summarize(groups) {
    let totalHouses = 0, totalPokemon = 0, score = 0, items = 0, maxItems = 0;
    for (const houses of Object.values(groups)) {
      for (const h of houses) {
        totalHouses++;
        totalPokemon += h.members.length;
        score += h.score;
        items += h.cost;
        if (h.cost > maxItems) maxItems = h.cost;
      }
    }
    return {
      totalHouses, totalPokemon,
      averageScore: totalHouses ? score / totalHouses : 0,
      itemsToPlace: items,
      maxItems,
      satisfy: options.satisfy,
    };
  }

  // Selection changed in the selector -> keep plan consistent
  store.subscribe('selectedPokemon', () => {
    if (pruneToSelection()) savePlan(plan);
    render();
  });

  // Shared link?
  const token = getHashQuery().get('p');
  if (token) {
    decodeShare(token).then((state) => {
      clearHashQuery();
      if (state) {
        applyState(state);
        toast(t('planner.planRestored'));
      } else {
        toast(t('planner.importError'), true);
      }
    });
  } else {
    pruneToSelection();
    render();
  }
}
