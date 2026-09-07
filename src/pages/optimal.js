import { el, $ } from '../utils/dom.js';
import { t } from '../core/i18n.js';
import { store } from '../core/store.js';
import { optimize } from '../algorithm/optimizer.js';
import { createHouseCard } from '../components/house-card.js';
import { createEnvironmentFilter } from '../components/environment-filter.js';
import { createOptionsPanel, loadOptions, applySourceFilter } from '../components/optimize-options.js';
import { createStatsSummary } from '../components/stats-summary.js';
import { announce } from '../utils/a11y.js';

const ENV_EMOJI = {
  Lumineux: '☀️', Sombre: '🌙', Chaud: '🔥',
  Frais: '❄️', Humide: '💧', Sec: '🏜️',
};

const ENV_COLORS = {
  Lumineux: '#f5c518', Sombre: '#6b3fa0', Chaud: '#e85d3a',
  Frais: '#5cc5e8', Humide: '#3b82d6', Sec: '#c2956a',
};

/**
 * Renders the Optimal Housing page into #app-main.
 * The result is computed in the browser from the full dataset so that the
 * DLC / event toggles and the minimum-shared-preferences setting apply.
 */
export function renderOptimalPage() {
  const main = $('#app-main');
  if (!main) return;

  main.innerHTML = '';

  main.appendChild(el('div', { className: 'page-header' },
    el('h1', { 'data-i18n': 'optimal.title' }, t('optimal.title')),
    el('p', { 'data-i18n': 'optimal.description' }, t('optimal.description'))
  ));

  // CTA banner to planner
  main.appendChild(el('div', { className: 'cta-banner' },
    el('div', { className: 'cta-banner__content' },
      el('span', { className: 'cta-banner__icon' }, '🗓️'),
      el('div', { className: 'cta-banner__text' },
        el('strong', null, t('optimal.ctaTitle')),
        el('span', null, t('optimal.ctaDescription'))
      )
    ),
    el('a', { href: '#/planner', className: 'btn btn-primary cta-banner__btn' }, t('nav.planner'))
  ));

  const options = loadOptions();
  const allPokemon = store.getState().allPokemon || [];

  const statsSlot = el('div');
  const resultsContainer = el('div', { className: 'results-container' });
  let selectedEnvs = [];
  let currentResult = null;

  const optionsPanel = createOptionsPanel(options, () => compute());
  main.appendChild(optionsPanel);
  main.appendChild(statsSlot);

  const envFilter = createEnvironmentFilter((envs) => {
    selectedEnvs = envs;
    if (currentResult) renderEnvironmentSections(currentResult.environmentGroups, selectedEnvs, resultsContainer);
  });
  main.appendChild(envFilter);
  main.appendChild(resultsContainer);

  function compute() {
    statsSlot.innerHTML = '';
    resultsContainer.innerHTML = '';
    resultsContainer.appendChild(el('div', { className: 'loading-state' },
      el('span', { className: 'loading-spinner' }),
      el('p', null, t('common.computing'))
    ));

    // Let the spinner paint before the (synchronous) computation
    setTimeout(() => {
      const list = applySourceFilter(allPokemon, options);
      currentResult = optimize(list, { satisfy: options.satisfy });
      statsSlot.innerHTML = '';
      statsSlot.appendChild(createStatsSummary(currentResult));
      renderEnvironmentSections(currentResult.environmentGroups, selectedEnvs, resultsContainer);
      announce(t('a11y.resultsUpdated').replace('{count}', String(currentResult.totalHouses)));
    }, 30);
  }

  compute();
}

/**
 * Renders environment sections with house cards, filtered by selected environments.
 *
 * @param {Object} environmentGroups
 * @param {string[]} selectedEnvs - empty = all
 * @param {HTMLElement} container
 */
function renderEnvironmentSections(environmentGroups, selectedEnvs, container) {
  container.innerHTML = '';

  let houseIndex = 1;
  for (const [envName, group] of Object.entries(environmentGroups)) {
    const startIndex = houseIndex;
    houseIndex += group.houses.length;
    if (selectedEnvs.length > 0 && !selectedEnvs.includes(envName)) continue;

    const translatedEnv = t(`environments.${envName}`) !== `environments.${envName}`
      ? t(`environments.${envName}`) : envName;
    const emoji = ENV_EMOJI[envName] || '🏠';
    const color = ENV_COLORS[envName] || '#95a5a6';

    const section = el('section', { className: 'env-section' },
      el('h2', {
        className: 'env-section-heading',
        style: `border-left: 4px solid ${color}; padding-left: var(--space-3); color: ${color}`,
      }, `${emoji} ${translatedEnv} (${group.houseCount} ${t('common.houses')})`)
    );

    const grid = el('div', { className: 'houses-grid' });
    group.houses.forEach((house, i) => {
      grid.appendChild(createHouseCard(house, startIndex + i));
    });
    section.appendChild(grid);
    container.appendChild(section);
  }
}
