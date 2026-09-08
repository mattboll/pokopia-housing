import { el } from '../utils/dom.js';
import { t } from '../core/i18n.js';
import { icon } from './icons.js';

const FIRST_VISIT_KEY = 'pokopia-housing-seen';

/**
 * Dismissible "first visit" banner, shown once per page key.
 * @param {'optimal'|'village'} page
 */
export function createFirstVisitBanner(page) {
  let seen = {};
  try { seen = JSON.parse(localStorage.getItem(FIRST_VISIT_KEY) || '{}'); } catch { /* ignore */ }
  if (seen[page]) return null;
  const banner = el('div', { className: 'first-visit', role: 'note' },
    el('span', { className: 'first-visit__icon' }, icon('help', { size: 20, color: '#E3350D' })),
    el('span', { className: 'first-visit__text' }, el('strong', null, `${t('firstVisit.title')} `), t(`firstVisit.${page}`)),
    el('button', { type: 'button', className: 'btn btn-ghost btn--sm', onClick: () => {
      seen[page] = true;
      try { localStorage.setItem(FIRST_VISIT_KEY, JSON.stringify(seen)); } catch { /* ignore */ }
      banner.remove();
    } }, t('firstVisit.close'))
  );
  return banner;
}

/**
 * Three stat tiles: houses, items to place, busiest house.
 * @param {{totalHouses: number, totalPokemon: number, itemsToPlace: number, maxItems: number}} r
 */
export function createStatTiles(r) {
  const avg = r.totalHouses > 0 ? (r.itemsToPlace / r.totalHouses).toFixed(1).replace('.', ',') : '0';
  const tile = (value, label, name, bg, color) => el('div', { className: 'stat-tile' },
    el('span', { className: 'stat-tile__icon', style: `background: ${bg}; color: ${color}` }, icon(name, { size: 22 })),
    el('span', { className: 'stat-tile__text' },
      el('span', { className: 'stat-tile__value' }, String(value)),
      el('span', { className: 'stat-tile__label' }, label)
    )
  );
  return el('div', { className: 'stat-tiles' },
    tile(r.totalHouses, t('stats.houses').replace('{n}', r.totalPokemon), 'house', '#FFDAC6', '#C44A1A'),
    tile(r.itemsToPlace, t('stats.items').replace('{avg}', avg), 'cart', '#BFD9F7', '#1A5DAA'),
    tile(r.maxItems, t('stats.busiest'), 'star', '#FFF3C4', '#B8960A'),
  );
}

/**
 * One-line settings summary with a "Change" button.
 * @param {{includeDlc: boolean, includeEvent: boolean, satisfy: number}} options
 * @param {() => void} onModify
 * @param {{showSources?: boolean}} [config]
 */
export function createSettingsSummary(options, onModify, config = {}) {
  const parts = [];
  if (config.showSources !== false) {
    parts.push(t(options.includeDlc ? 'settings.summaryDlc' : 'settings.summaryNoDlc'));
    parts.push(t(options.includeEvent ? 'settings.summaryEvent' : 'settings.summaryNoEvent'));
  }
  parts.push(t('settings.summarySatisfy').replace('{n}', options.satisfy));
  const btn = el('button', { type: 'button', className: 'settings-summary', 'aria-expanded': 'false', onClick: onModify },
    icon('sliders', { size: 16 }),
    el('span', { className: 'settings-summary__text' }, parts.join(' · ')),
    el('span', { className: 'settings-summary__cta' }, t('settings.modify'))
  );
  return btn;
}

/**
 * Environment heading with the coloured glyph.
 * @param {string} env
 * @param {string} translatedEnv
 * @param {string} meta - e.g. "28 maisons"
 */
export function createEnvHeading(env, translatedEnv, meta, colors) {
  return el('h2', { className: 'env-heading' },
    el('span', { className: 'env-glyph', style: `background: ${colors.light}; color: ${colors.dark}` }, icon('house', { size: 16 })),
    el('span', null, translatedEnv),
    el('span', { className: 'env-heading__meta' }, meta)
  );
}
