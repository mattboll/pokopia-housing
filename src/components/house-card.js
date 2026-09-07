import { el } from '../utils/dom.js';
import { t } from '../core/i18n.js';
import { createPokemonNameButton } from './pokemon-popover.js';

/** Currently dragged resident (module-level so dragover can read it). */
let dragging = null;

/** @returns {{name: string, fromId: string, environment: string} | null} */
export function getDragging() {
  return dragging;
}

const ENV_COLORS = {
  Lumineux: '#f5c518', Sombre: '#6b3fa0', Chaud: '#e85d3a',
  Frais: '#5cc5e8', Humide: '#3b82d6', Sec: '#c2956a',
};

const ENV_EMOJI = {
  Lumineux: '\u2600\uFE0F', Sombre: '\uD83C\uDF19', Chaud: '\uD83D\uDD25',
  Frais: '\u2744\uFE0F', Humide: '\uD83D\uDCA7', Sec: '\uD83C\uDFDC\uFE0F',
};

/**
 * Counts how many members like each preference.
 * Returns a Map<number, string[]> : count → list of preferences.
 *
 * @param {Array<{preferences: string[]}>} members
 * @returns {Map<number, string[]>}
 */
function buildPrefCounts(members) {
  // Count occurrences of each preference
  const counts = new Map();
  for (const m of members) {
    for (const pref of m.preferences) {
      counts.set(pref, (counts.get(pref) || 0) + 1);
    }
  }

  // Group by count
  const tiers = new Map();
  for (const [pref, count] of counts) {
    if (!tiers.has(count)) tiers.set(count, []);
    tiers.get(count).push(pref);
  }

  return tiers;
}

/**
 * Rates a house on the number of items to place, relative to the ideal
 * (everyone shares the same `satisfy` favorites = `satisfy` items) and the
 * worst case (nothing shared = `satisfy` items per resident).
 */
function compatibilityRating(house) {
  const members = house.members.length;
  if (members <= 1) return { stars: 5, key: 'rating.perfect', fallback: 'Parfait', color: '#2ea858' };

  const k = house.satisfy || 4;
  const cost = typeof house.cost === 'number' ? house.cost : (house.uniquePreferences || []).length;
  const ideal = k;
  const worst = k * members;
  const ratio = worst > ideal ? (cost - ideal) / (worst - ideal) : 0;

  if (ratio <= 0.15) return { stars: 5, key: 'rating.excellent', fallback: 'Excellent', color: '#2ea858' };
  if (ratio <= 0.3) return { stars: 4, key: 'rating.veryGood', fallback: 'Tres bien', color: '#6bba4f' };
  if (ratio <= 0.5) return { stars: 3, key: 'rating.good', fallback: 'Bien', color: '#f5c518' };
  if (ratio <= 0.7) return { stars: 2, key: 'rating.okay', fallback: 'Correct', color: '#e5a419' };
  return { stars: 1, key: 'rating.low', fallback: 'Faible', color: '#e74c3c' };
}

/**
 * @typedef {Object} HouseCardOptions
 * @property {boolean} [editable=false] - show lock / move controls and accept drops
 * @property {(house: Object) => void} [onToggleLock]
 * @property {(memberName: string, house: Object, anchor: HTMLElement) => void} [onMove]
 * @property {(memberName: string, fromId: string, house: Object) => void} [onDrop]
 */

/**
 * Creates a house card DOM element.
 *
 * @param {Object} house - { members, sharedPreferences, uniquePreferences, items, covered, cost, satisfy, locked?, id? }
 * @param {number} index - display number
 * @param {HouseCardOptions} [opts]
 */
export function createHouseCard(house, index, opts = {}) {
  const env = house.members[0]?.environment || '';
  const envColor = ENV_COLORS[env] || '#95a5a6';
  const envEmoji = ENV_EMOJI[env] || '\uD83C\uDFE0';
  const translatedEnv = t(`environments.${env}`) !== `environments.${env}`
    ? t(`environments.${env}`) : env;
  const envSlug = env.toLowerCase();

  const rating = compatibilityRating(house);
  const ratingLabel = t(rating.key) !== rating.key ? t(rating.key) : rating.fallback;
  const starsStr = '\u2B50'.repeat(rating.stars) + '\u2606'.repeat(5 - rating.stars);

  // Header
  const editable = Boolean(opts.editable);
  const header = el('div', { className: 'house-card-header', style: `border-bottom: 3px solid ${envColor}` },
    el('h3', { className: 'house-card-title' },
      `\uD83C\uDFE0 ${t('common.house')} #${index}`,
      house.locked ? el('span', { className: 'house-card-locked-badge', title: t('planner.locked') }, ' 🔒') : null
    ),
    el('span', { className: `badge env-badge badge-env--${envSlug}` },
      `${envEmoji} ${translatedEnv}`
    )
  );
  if (editable && opts.onToggleLock) {
    header.appendChild(el('button', {
      type: 'button',
      className: 'btn btn-ghost btn--sm house-card-lock-btn',
      'aria-pressed': String(Boolean(house.locked)),
      'aria-label': house.locked ? t('planner.unlock') : t('planner.lock'),
      title: house.locked ? t('planner.unlock') : t('planner.lock'),
      onClick: () => opts.onToggleLock(house),
    }, house.locked ? '🔓' : '🔒'));
  }

  // Compatibility rating
  const itemCount = typeof house.cost === 'number' ? house.cost : (house.uniquePreferences || []).length;
  const ratingSection = el('div', { className: 'house-card-rating' },
    el('div', { className: 'house-card-rating-stars', style: `color: ${rating.color}` }, starsStr),
    el('span', { className: 'house-card-rating-label', style: `color: ${rating.color}` }, ratingLabel),
    el('span', {
      className: 'house-card-compat',
      title: t('common.itemsToPlace'),
      'aria-label': `${t('common.itemsToPlace')}: ${itemCount}`,
    }, `🛋️ ${itemCount}`)
  );

  // Residents (clickable)
  const residentsList = el('div', { className: 'house-card-residents' });
  const itemSet = new Set(house.items || []);
  house.members.forEach((member, i) => {
    if (i > 0) residentsList.appendChild(el('span', { className: 'house-card-sep' }, ', '));
    const nameBtn = createPokemonNameButton(member, house.items || house.sharedPreferences);
    if (house.covered) {
      const k = Math.min(house.satisfy || 4, member.preferences.length);
      const c = house.covered[i];
      nameBtn.appendChild(el('span', {
        className: 'house-card-covered' + (c >= k ? ' house-card-covered--ok' : ''),
        title: `${c}/${member.preferences.length} ${t('common.coveredPrefs')}`,
      }, ` ${c}/${member.preferences.length}`));
    }
    if (!editable) {
      residentsList.appendChild(nameBtn);
      return;
    }
    const resident = el('span', { className: 'house-card-resident', draggable: 'true' }, nameBtn);
    resident.addEventListener('dragstart', (e) => {
      dragging = { name: member.name, fromId: house.id, environment: member.environment };
      resident.classList.add('house-card-resident--dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', member.name);
    });
    resident.addEventListener('dragend', () => {
      dragging = null;
      resident.classList.remove('house-card-resident--dragging');
    });
    if (opts.onMove) {
      const moveBtn = el('button', {
        type: 'button',
        className: 'house-card-move-btn',
        'aria-label': `${t('planner.move')} ${nameBtn.textContent}`,
        title: t('planner.move'),
        onClick: (e) => { e.stopPropagation(); opts.onMove(member.name, house, moveBtn); },
      }, '⇄');
      resident.appendChild(moveBtn);
    }
    residentsList.appendChild(resident);
  });
  const residentsSection = el('div', { className: 'house-card-section' },
    el('h4', { className: 'house-card-section-title' },
      `\uD83D\uDC3E ${t('common.residents')} (${house.members.length})`
    ),
    residentsList
  );

  // Shopping list: categories to place (minimum cover)
  let shoppingSection = null;
  if (house.items && house.items.length > 0) {
    const pills = el('div', { className: 'house-card-pills' });
    const likedBy = (pref) => house.members.filter((m) => m.preferences.includes(pref)).length;
    const sortedItems = [...house.items].sort((a, b) => likedBy(b) - likedBy(a));
    for (const pref of sortedItems) {
      const translated = t(`preferences.${pref}`) !== `preferences.${pref}` ? t(`preferences.${pref}`) : pref;
      const n = likedBy(pref);
      pills.appendChild(el('span', {
        className: 'house-card-pill house-card-pill--item',
        title: `${n}/${house.members.length}`,
      }, `${translated} `, el('span', { className: 'house-card-pill__count' }, `×${n}`)));
    }
    shoppingSection = el('div', { className: 'house-card-section house-card-shopping' },
      el('h4', { className: 'house-card-section-title' }, `🛒 ${t('common.shoppingList')} (${house.items.length})`),
      pills
    );
  }

  // Preferences grouped by how many residents like them
  const prefCounts = buildPrefCounts(house.members);
  const prefsSection = el('details', { className: 'house-card-section house-card-prefs' },
    el('summary', { className: 'house-card-section-title' }, `🐾 ${t('common.uniquePrefs')} (${(house.uniquePreferences || []).length})`)
  );
  const memberCount = house.members.length;

  // Sort tiers from most residents to fewest
  const tiers = [...prefCounts.entries()]
    .sort((a, b) => b[0] - a[0]);

  for (const [count, prefs] of tiers) {
    const tierEl = el('div', { className: 'house-card-tier' });

    // Label: "4/4", "3/4", etc. with paw prints
    const paws = '\uD83D\uDC3E'.repeat(count);
    const tierLabel = memberCount > 1
      ? `${count}/${memberCount} ${paws}`
      : paws;

    const tierClass = count === memberCount ? 'house-card-tier-label--all' :
                      count >= memberCount * 0.5 ? 'house-card-tier-label--most' :
                      'house-card-tier-label--few';

    tierEl.appendChild(el('span', {
      className: `house-card-tier-label ${tierClass}`,
    }, tierLabel));

    const pills = el('div', { className: 'house-card-pills' });
    const pillClass = count === memberCount ? 'house-card-pill--shared' :
                      count >= memberCount * 0.5 ? 'house-card-pill--most' :
                      'house-card-pill--unique';

    for (const pref of prefs) {
      const translated = t(`preferences.${pref}`) !== `preferences.${pref}`
        ? t(`preferences.${pref}`) : pref;
      const chosen = itemSet.has(pref) ? ' house-card-pill--chosen' : '';
      pills.appendChild(el('span', { className: `house-card-pill ${pillClass}${chosen}` }, (chosen ? '✔ ' : '') + translated));
    }
    tierEl.appendChild(pills);
    prefsSection.appendChild(tierEl);
  }

  // Assemble
  const card = el('article', {
    className: `card house-card card--env-${envSlug}`,
    role: 'article',
    'aria-label': `${t('common.house')} #${index} - ${house.members.length} ${t('common.residents')} - ${ratingLabel}`,
  });
  card.appendChild(header);
  card.appendChild(ratingSection);
  card.appendChild(residentsSection);
  if (shoppingSection) card.appendChild(shoppingSection);
  card.appendChild(prefsSection);

  if (editable && opts.onDrop) {
    const canAccept = () => dragging
      && dragging.fromId !== house.id
      && dragging.environment === env
      && !house.locked
      && house.members.length < 4;
    card.addEventListener('dragover', (e) => {
      if (!canAccept()) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      card.classList.add('house-card--drop-target');
    });
    card.addEventListener('dragleave', () => card.classList.remove('house-card--drop-target'));
    card.addEventListener('drop', (e) => {
      card.classList.remove('house-card--drop-target');
      if (!canAccept()) return;
      e.preventDefault();
      const info = dragging;
      dragging = null;
      opts.onDrop(info.name, info.fromId, house);
    });
  }
  if (house.locked) card.classList.add('house-card--locked');
  return card;
}
