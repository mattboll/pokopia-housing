import { el } from '../utils/dom.js';
import { t } from '../core/i18n.js';

/**
 * Renders the stats cards for an optimization result.
 *
 * @param {{totalHouses: number, totalPokemon: number, averageScore: number, averageCompatibility: number, itemsToFind: number}} result
 * @returns {HTMLElement}
 */
export function createStatsSummary(result) {
  const card = (icon, value, labelKey) => el('div', { className: 'stat-card' },
    el('span', { className: 'stat-icon' }, icon),
    el('span', { className: 'stat-value' }, value),
    el('span', { className: 'stat-label', 'data-i18n': labelKey }, t(labelKey))
  );

  return el('div', { className: 'stats-summary' },
    card('🏠', String(result.totalHouses), 'common.totalHouses'),
    card('🐾', String(result.totalPokemon), 'common.totalPokemon'),
    card('⭐', result.averageScore.toFixed(2), 'common.avgScore'),
    card('🤝', `${Math.round(result.averageCompatibility * 100)}%`, 'common.avgCompatibility'),
    card('🛋️', String(result.itemsToFind), 'common.itemsToFind'),
  );
}
