import { el } from '../utils/dom.js';
import { t } from '../core/i18n.js';
import { envColor } from '../core/environments.js';
import { spriteUrl } from '../core/sprites.js';
import { compatibilityRating } from '../algorithm/rating.js';
import { icon, stars } from './icons.js';

/**
 * A house tile: environment band, 2x2 grid of residents, stars and the
 * number of items to place. Click/Enter opens the detail.
 *
 * @param {Object} house - { id?, members, cost, satisfy, locked? }
 * @param {number} index - display number
 * @param {{selected?: boolean, onSelect?: (house: Object, tile: HTMLElement) => void}} [opts]
 * @returns {HTMLElement}
 */
export function createHouseTile(house, index, opts = {}) {
  const env = house.members[0]?.environment || '';
  const colors = envColor(env);
  const rating = compatibilityRating(house);
  const translatedEnv = t(`environments.${env}`) !== `environments.${env}` ? t(`environments.${env}`) : env;
  const tn = (name) => (t(`pokemon.${name}`) !== `pokemon.${name}` ? t(`pokemon.${name}`) : name);
  const names = house.members.map((m) => tn(m.name)).join(', ');

  const band = el('div', { className: 'house-tile__band', style: `background: ${colors.light}; border-bottom-color: ${colors.main}; color: ${colors.dark}` },
    el('span', { className: 'house-tile__title' }, icon('house', { size: 15 }), ` ${t('common.house')} ${index}`),
    house.locked ? el('span', { className: 'house-tile__lock', title: t('planner.locked') }, icon('lock', { size: 12 })) : null
  );

  const grid = el('div', { className: 'house-tile__grid' });
  for (const m of house.members) {
    const url = spriteUrl(m.name);
    grid.appendChild(el('span', { className: 'house-tile__slot', title: tn(m.name) },
      url ? el('img', { src: url, alt: '', loading: 'lazy', width: '44', height: '44' }) : el('span', { className: 'house-tile__fallback' }, tn(m.name).slice(0, 3))
    ));
  }
  for (let i = house.members.length; i < 4; i++) {
    grid.appendChild(el('span', { className: 'house-tile__slot house-tile__slot--empty', 'aria-hidden': 'true' }));
  }

  const footer = el('div', { className: 'house-tile__footer' },
    stars(rating.stars, 12),
    el('span', { className: 'house-tile__items', title: t('common.itemsToPlace') }, icon('cart', { size: 13 }), ` ${house.cost}`)
  );

  const tile = el('button', {
    type: 'button',
    className: 'house-tile' + (opts.selected ? ' house-tile--selected' : '') + (house.locked ? ' house-tile--locked' : ''),
    'aria-pressed': String(Boolean(opts.selected)),
    'aria-label': `${t('common.house')} ${index}, ${translatedEnv}: ${names}. ${t('common.itemsToPlace')}: ${house.cost}`,
    'data-house-id': house.id || '',
    onClick: () => opts.onSelect && opts.onSelect(house, tile),
  }, band, grid, footer);

  return tile;
}
