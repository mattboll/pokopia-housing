import { el, $ } from '../utils/dom.js';
import { t } from '../core/i18n.js';
import { createHouseCard } from '../components/house-card.js';
import { createEnvironmentFilter } from '../components/environment-filter.js';

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
 * Renders the Optimal Housing page into #app-main.
 * Fetches pre-computed optimal results and displays them grouped by environment.
 */
export async function renderOptimalPage() {
  const main = $('#app-main');
  if (!main) return;

  main.innerHTML = '';

  // Page header
  const pageHeader = el('div', { className: 'page-header' },
    el('h1', { 'data-i18n': 'optimal.title' }, t('optimal.title')),
    el('p', { 'data-i18n': 'optimal.description' }, t('optimal.description'))
  );
  main.appendChild(pageHeader);

  // Loading state with spinner
  const loading = el('div', { className: 'loading-state' },
    el('span', { className: 'loading-spinner' }),
    el('p', null, '...')
  );
  main.appendChild(loading);

  try {
    const base = import.meta.env.BASE_URL ?? '/pokopia-housing/';
    const response = await fetch(`${base}data/optimal-result.json`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();

    // Remove loading
    loading.remove();

    // CTA banner to planner
    const ctaBanner = el('div', { className: 'cta-banner' },
      el('div', { className: 'cta-banner__content' },
        el('span', { className: 'cta-banner__icon' }, '\uD83D\uDDD3\uFE0F'),
        el('div', { className: 'cta-banner__text' },
          el('strong', null,
            t('optimal.ctaTitle') !== 'optimal.ctaTitle'
              ? t('optimal.ctaTitle')
              : 'Vous n\u2019avez pas tous les Pok\u00E9mon ?'
          ),
          el('span', null,
            t('optimal.ctaDescription') !== 'optimal.ctaDescription'
              ? t('optimal.ctaDescription')
              : 'Utilisez le planificateur pour optimiser uniquement ceux que vous poss\u00E9dez.'
          )
        )
      ),
      el('a', {
        href: '#/planner',
        className: 'btn btn-primary cta-banner__btn',
      },
        t('nav.planner') !== 'nav.planner'
          ? t('nav.planner')
          : 'Planificateur'
      )
    );
    main.appendChild(ctaBanner);

    // Stats summary with emoji icons
    const stats = el('div', { className: 'stats-summary' },
      el('div', { className: 'stat-card' },
        el('span', { className: 'stat-icon' }, '\uD83C\uDFE0'),
        el('span', { className: 'stat-value' }, String(data.totalHouses)),
        el('span', { className: 'stat-label', 'data-i18n': 'common.totalHouses' }, t('common.totalHouses'))
      ),
      el('div', { className: 'stat-card' },
        el('span', { className: 'stat-icon' }, '\uD83D\uDC3E'),
        el('span', { className: 'stat-value' }, String(data.totalPokemon)),
        el('span', { className: 'stat-label', 'data-i18n': 'common.totalPokemon' }, t('common.totalPokemon'))
      ),
      el('div', { className: 'stat-card' },
        el('span', { className: 'stat-icon' }, '\u2B50'),
        el('span', { className: 'stat-value' }, data.averageScore.toFixed(2)),
        el('span', { className: 'stat-label', 'data-i18n': 'common.avgScore' }, t('common.avgScore'))
      )
    );
    main.appendChild(stats);

    // Environment filter
    const resultsContainer = el('div', { className: 'results-container' });

    const envFilter = createEnvironmentFilter((selectedEnvs) => {
      renderEnvironmentSections(data.environmentGroups, selectedEnvs, resultsContainer);
    });
    main.appendChild(envFilter);
    main.appendChild(resultsContainer);

    // Initial render of all environments
    renderEnvironmentSections(data.environmentGroups, [], resultsContainer);

  } catch (err) {
    loading.innerHTML = '';
    loading.className = 'empty-state';
    loading.appendChild(el('p', null, t('common.noResults')));
    console.error('Failed to load optimal results:', err);
  }
}

/**
 * Renders house cards grouped by environment sections with colored headers.
 *
 * @param {Record<string, {environment: string, houses: Array, pokemonCount: number, houseCount: number}>} environmentGroups
 * @param {string[]} selectedEnvs - Empty array means show all
 * @param {HTMLElement} container
 */
function renderEnvironmentSections(environmentGroups, selectedEnvs, container) {
  container.innerHTML = '';

  let houseIndex = 1;

  for (const [envName, group] of Object.entries(environmentGroups)) {
    if (selectedEnvs.length > 0 && !selectedEnvs.includes(envName)) {
      houseIndex += group.houses.length;
      continue;
    }

    const translatedEnv = t(`environments.${envName}`) !== `environments.${envName}`
      ? t(`environments.${envName}`)
      : envName;

    const emoji = ENV_EMOJI[envName] || '\uD83C\uDFE0';
    const color = ENV_COLORS[envName] || '#95a5a6';

    const sectionHeading = el('h2', {
      className: 'env-section-heading',
      style: `border-left: 4px solid ${color}; padding-left: var(--space-3); color: ${color}`,
    },
      `${emoji} ${translatedEnv} (${group.houseCount} ${t('common.houses')}, ${group.pokemonCount} Pok\u00E9mon)`
    );

    const section = el('section', { className: 'env-section' }, sectionHeading);

    const grid = el('div', { className: 'houses-grid' });
    for (const house of group.houses) {
      grid.appendChild(createHouseCard(house, houseIndex));
      houseIndex++;
    }

    section.appendChild(grid);
    container.appendChild(section);
  }
}
