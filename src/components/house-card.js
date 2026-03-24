import { el } from '../utils/dom.js';
import { t } from '../core/i18n.js';
import { createPokemonNameButton, showPrefsListPopover } from './pokemon-popover.js';

const ENV_COLORS = {
  Lumineux: '#f5c518', Sombre: '#6b3fa0', Chaud: '#e85d3a',
  Frais: '#5cc5e8', Humide: '#3b82d6', Sec: '#c2956a',
};

const ENV_EMOJI = {
  Lumineux: '\u2600\uFE0F', Sombre: '\uD83C\uDF19', Chaud: '\uD83D\uDD25',
  Frais: '\u2744\uFE0F', Humide: '\uD83D\uDCA7', Sec: '\uD83C\uDFDC\uFE0F',
};

/**
 * Computes a compatibility rating from totalScore.
 */
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
 * Rates a house based on what the player actually sees:
 * - How many preferences ALL residents share (fewer unique items needed)
 * - How many different items you need to find in total
 * A house where everyone likes the same things = excellent.
 * A house with many different preferences to cover = lower rating.
 */
function compatibilityRating(house) {
  const members = house.members.length;
  if (members <= 1) return { stars: 5, key: 'rating.perfect', fallback: 'Parfait', color: '#2ea858' };

  const shared = (house.sharedPreferences || []).length;
  const uniqueAll = (house.uniquePreferences || []).length;
  const toFind = uniqueAll - shared; // items to find beyond shared ones

  // Ratio: what fraction of all preferences are shared by everyone?
  // Higher = residents are more aligned = less furniture work
  const ratio = uniqueAll > 0 ? shared / uniqueAll : 0;

  // Also factor in absolute count of items to find (fewer = better)
  // A house with 3 shared + 2 to find is better than 3 shared + 15 to find
  const efficiency = toFind <= 4 ? 2 : toFind <= 8 ? 1 : toFind <= 12 ? 0 : -1;

  const score = ratio * 4 + efficiency;

  // Thresholds calibrated on actual data (median ~-0.5, max ~2.8)
  if (score >= 2.2) return { stars: 5, key: 'rating.excellent', fallback: 'Excellent', color: '#2ea858' };
  if (score >= 1.5) return { stars: 4, key: 'rating.veryGood', fallback: 'Tres bien', color: '#6bba4f' };
  if (score >= 0.5) return { stars: 3, key: 'rating.good', fallback: 'Bien', color: '#f5c518' };
  if (score >= -0.5) return { stars: 2, key: 'rating.okay', fallback: 'Correct', color: '#e5a419' };
  return { stars: 1, key: 'rating.low', fallback: 'Faible', color: '#e74c3c' };
}

/**
 * Creates a house card DOM element.
 */
export function createHouseCard(house, index) {
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
  const header = el('div', { className: 'house-card-header', style: `border-bottom: 3px solid ${envColor}` },
    el('h3', { className: 'house-card-title' },
      `\uD83C\uDFE0 ${t('common.house')} #${index}`
    ),
    el('span', { className: `badge env-badge badge-env--${envSlug}` },
      `${envEmoji} ${translatedEnv}`
    )
  );

  // Compatibility rating
  const ratingSection = el('div', { className: 'house-card-rating' },
    el('div', { className: 'house-card-rating-stars', style: `color: ${rating.color}` }, starsStr),
    el('span', { className: 'house-card-rating-label', style: `color: ${rating.color}` }, ratingLabel)
  );

  // Residents (clickable)
  const residentsList = el('div', { className: 'house-card-residents' });
  house.members.forEach((member, i) => {
    if (i > 0) residentsList.appendChild(el('span', { className: 'house-card-sep' }, ', '));
    residentsList.appendChild(createPokemonNameButton(member, house.sharedPreferences));
  });
  const residentsSection = el('div', { className: 'house-card-section' },
    el('h4', { className: 'house-card-section-title' },
      `\uD83D\uDC3E ${t('common.residents')} (${house.members.length})`
    ),
    residentsList
  );

  // Preferences grouped by how many residents like them
  const prefCounts = buildPrefCounts(house.members);
  const prefsSection = el('div', { className: 'house-card-section house-card-prefs' });
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
      pills.appendChild(el('span', { className: `house-card-pill ${pillClass}` }, translated));
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
  card.appendChild(prefsSection);
  return card;
}
