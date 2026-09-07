import { el } from '../utils/dom.js';
import { t } from '../core/i18n.js';

/**
 * Renders the stats cards for an optimization result.
 *
 * @param {{totalHouses: number, totalPokemon: number, averageScore: number, itemsToPlace: number, maxItems: number}} result
 * @returns {HTMLElement}
 */
export function createStatsSummary(result) {
  const card = (icon, value, labelKey, extraClass = '') => el('div', { className: `stat-card ${extraClass}`.trim() },
    el('span', { className: 'stat-icon' }, icon),
    el('span', { className: 'stat-value' }, value),
    el('span', { className: 'stat-label', 'data-i18n': labelKey }, t(labelKey))
  );

  const perHouse = result.totalHouses > 0 ? result.itemsToPlace / result.totalHouses : 0;

  return el('div', { className: 'stats-summary' },
    card('🏠', String(result.totalHouses), 'common.totalHouses'),
    card('🐾', String(result.totalPokemon), 'common.totalPokemon'),
    card('🛋️', String(result.itemsToPlace), 'common.itemsToPlace', 'stat-card--primary'),
    card('📦', perHouse.toFixed(1), 'common.itemsPerHouse'),
    card('📈', String(result.maxItems), 'common.maxItems'),
    card('⭐', result.averageScore.toFixed(2), 'common.avgShared', 'stat-card--muted'),
  );
}
