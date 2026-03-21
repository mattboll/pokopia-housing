import { el, $ } from '../utils/dom.js';
import { t } from '../core/i18n.js';
import { store } from '../core/store.js';
import { createPokemonSelector } from '../components/pokemon-selector.js';
import { createHouseCard } from '../components/house-card.js';
import { optimize } from '../algorithm/optimizer.js';
import { announce } from '../utils/a11y.js';

/**
 * Environment emoji mapping for section headers.
 */
const ENV_EMOJI = {
  Lumineux: '\u2600\uFE0F',
  Sombre: '\uD83C\uDF19',
  Chaud: '\uD83D\uDD25',
  Frais: '\u2744\uFE0F',
  Humide: '\uD83D\uDCA7',
  Sec: '\uD83C\uDFDC\uFE0F',
};

const ENV_COLORS = {
  Lumineux: '#f5c518',
  Sombre: '#6b3fa0',
  Chaud: '#e85d3a',
  Frais: '#5cc5e8',
  Humide: '#3b82d6',
  Sec: '#c2956a',
};

/**
 * Renders the Custom Planner page into #app-main.
 * Left panel: Pokemon selector. Right panel: optimization results.
 */
export function renderPlannerPage() {
  const main = $('#app-main');
  if (!main) return;

  main.innerHTML = '';

  // Page header
  const pageHeader = el('div', { className: 'page-header' },
    el('h1', { 'data-i18n': 'planner.title' }, t('planner.title')),
    el('p', { 'data-i18n': 'planner.description' }, t('planner.description'))
  );
  main.appendChild(pageHeader);

  // Layout: two panels
  const layout = el('div', { className: 'planner-layout' });

  // Left panel: Pokemon selector
  const allPokemon = store.getState().allPokemon || [];
  const leftPanel = el('div', { className: 'planner-panel planner-panel-left' });
  const selector = createPokemonSelector(allPokemon, store);
  leftPanel.appendChild(selector);

  // Optimize button - big and prominent
  const optimizeBtn = el('button', {
    type: 'button',
    className: 'btn btn-primary btn--lg optimize-btn',
    'data-i18n': 'common.optimize',
    onClick: () => runOptimization(resultsArea, optimizeBtn),
  }, '\uD83C\uDFE0 ' + t('common.optimize'));
  leftPanel.appendChild(optimizeBtn);

  // Right panel: results
  const rightPanel = el('div', { className: 'planner-panel planner-panel-right' });
  const resultsArea = el('div', { className: 'planner-results' });

  // Initial empty state with friendly message
  const emptyState = el('div', { className: 'planner-empty-state' },
    el('span', { className: 'planner-empty-icon' }, '\uD83C\uDFE0'),
    el('p', { className: 'planner-empty-title' },
      t('planner.emptyState') !== 'planner.emptyState'
        ? t('planner.emptyState')
        : 'S\u00E9lectionnez des Pok\u00E9mon et lancez l\'optimisation !'
    ),
    el('p', { className: 'planner-empty-hint' },
      t('planner.emptyHint') !== 'planner.emptyHint'
        ? t('planner.emptyHint')
        : 'Choisissez au moins 2 Pok\u00E9mon dans le panneau de gauche, puis cliquez sur le bouton Optimiser.'
    )
  );
  resultsArea.appendChild(emptyState);

  rightPanel.appendChild(resultsArea);

  layout.appendChild(leftPanel);
  layout.appendChild(rightPanel);
  main.appendChild(layout);
}

/**
 * Runs the optimization algorithm and renders results.
 * Shows a brief loading state while computing.
 *
 * @param {HTMLElement} resultsArea - Container to render results into
 * @param {HTMLElement} optimizeBtn - The button, to disable during compute
 */
function runOptimization(resultsArea, optimizeBtn) {
  resultsArea.innerHTML = '';

  const state = store.getState();
  const selectedNames = state.selectedPokemon;
  const allPokemon = state.allPokemon || [];

  if (!(selectedNames instanceof Set) || selectedNames.size < 2) {
    const prompt = el('div', { className: 'planner-empty-state' },
      el('span', { className: 'planner-empty-icon' }, '\u26A0\uFE0F'),
      el('p', { className: 'planner-empty-title', 'data-i18n': 'planner.selectPrompt' },
        t('planner.selectPrompt') !== 'planner.selectPrompt'
          ? t('planner.selectPrompt')
          : 'Veuillez s\u00E9lectionner au moins 2 Pok\u00E9mon.'
      )
    );
    resultsArea.appendChild(prompt);
    return;
  }

  // Filter to selected Pokemon
  const selectedPokemon = allPokemon.filter((p) => selectedNames.has(p.name));

  if (selectedPokemon.length < 2) {
    const prompt = el('div', { className: 'planner-empty-state' },
      el('span', { className: 'planner-empty-icon' }, '\u26A0\uFE0F'),
      el('p', { className: 'planner-empty-title', 'data-i18n': 'planner.selectPrompt' },
        t('planner.selectPrompt') !== 'planner.selectPrompt'
          ? t('planner.selectPrompt')
          : 'Veuillez s\u00E9lectionner au moins 2 Pok\u00E9mon.'
      )
    );
    resultsArea.appendChild(prompt);
    return;
  }

  // Show loading state
  optimizeBtn.disabled = true;
  const loadingEl = el('div', { className: 'loading-state' },
    el('span', { className: 'loading-spinner' }),
    el('p', null, 'Optimisation en cours...')
  );
  resultsArea.appendChild(loadingEl);

  // Use requestAnimationFrame to let the loading state render before blocking compute
  requestAnimationFrame(() => {
    setTimeout(() => {
      // Run optimizer
      const result = optimize(selectedPokemon);
      store.setState({ results: result });

      // Clear loading
      resultsArea.innerHTML = '';
      optimizeBtn.disabled = false;

      // Stats summary with emoji icons
      const stats = el('div', { className: 'stats-summary' },
        el('div', { className: 'stat-card' },
          el('span', { className: 'stat-icon' }, '\uD83C\uDFE0'),
          el('span', { className: 'stat-value' }, String(result.totalHouses)),
          el('span', { className: 'stat-label', 'data-i18n': 'common.totalHouses' }, t('common.totalHouses'))
        ),
        el('div', { className: 'stat-card' },
          el('span', { className: 'stat-icon' }, '\uD83D\uDC3E'),
          el('span', { className: 'stat-value' }, String(result.totalPokemon)),
          el('span', { className: 'stat-label', 'data-i18n': 'common.totalPokemon' }, t('common.totalPokemon'))
        ),
        el('div', { className: 'stat-card' },
          el('span', { className: 'stat-icon' }, '\u2B50'),
          el('span', { className: 'stat-value' }, result.averageScore.toFixed(2)),
          el('span', { className: 'stat-label', 'data-i18n': 'common.avgScore' }, t('common.avgScore'))
        )
      );
      resultsArea.appendChild(stats);

      // House cards grouped by environment
      let houseIndex = 1;
      for (const [envName, group] of Object.entries(result.environmentGroups)) {
        const translatedEnv = t(`environments.${envName}`) !== `environments.${envName}`
          ? t(`environments.${envName}`)
          : envName;

        const emoji = ENV_EMOJI[envName] || '\uD83C\uDFE0';
        const color = ENV_COLORS[envName] || '#95a5a6';

        const section = el('section', { className: 'env-section' },
          el('h2', {
            className: 'env-section-heading',
            style: `border-left: 4px solid ${color}; padding-left: var(--space-3); color: ${color}`,
          },
            `${emoji} ${translatedEnv} (${group.houseCount} ${t('common.houses')})`
          )
        );

        const grid = el('div', { className: 'houses-grid' });
        for (const house of group.houses) {
          grid.appendChild(createHouseCard(house, houseIndex));
          houseIndex++;
        }

        section.appendChild(grid);
        resultsArea.appendChild(section);
      }

      // Announce results for screen readers
      const announcement = t('a11y.resultsUpdated').replace('{count}', String(result.totalHouses));
      announce(announcement);
    }, 50);
  });
}
