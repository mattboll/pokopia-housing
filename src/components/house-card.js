import { el } from '../utils/dom.js';
import { t } from '../core/i18n.js';

/**
 * Environment color mapping for badges.
 */
const ENV_COLORS = {
  Lumineux: '#f5c518',
  Sombre: '#6b3fa0',
  Chaud: '#e85d3a',
  Frais: '#5cc5e8',
  Humide: '#3b82d6',
  Sec: '#c2956a',
};

/**
 * Environment emoji mapping.
 */
const ENV_EMOJI = {
  Lumineux: '\u2600\uFE0F',
  Sombre: '\uD83C\uDF19',
  Chaud: '\uD83D\uDD25',
  Frais: '\u2744\uFE0F',
  Humide: '\uD83D\uDCA7',
  Sec: '\uD83C\uDFDC\uFE0F',
};

/**
 * Returns a color for the score bar based on score/maxScore ratio.
 *
 * @param {number} ratio - 0 to 1
 * @returns {string} CSS color
 */
function scoreColor(ratio) {
  if (ratio >= 0.8) return '#2ea858';
  if (ratio >= 0.5) return '#f5c518';
  if (ratio >= 0.3) return '#e5a419';
  return '#e74c3c';
}

/**
 * Creates a house card DOM element with fun Pokemon styling.
 *
 * @param {{members: Array, sharedPreferences: string[], score: number, uniquePreferences: string[]}} house
 * @param {number} index - 1-based house index
 * @returns {HTMLElement}
 */
export function createHouseCard(house, index) {
  const env = house.members[0]?.environment || '';
  const envColor = ENV_COLORS[env] || '#95a5a6';
  const envEmoji = ENV_EMOJI[env] || '\uD83C\uDFE0';
  const translatedEnv = t(`environments.${env}`) !== `environments.${env}`
    ? t(`environments.${env}`)
    : env;
  const envSlug = env.toLowerCase();

  const needsDark = luminanceCheck(envColor);

  const ariaLabel = t('a11y.houseLabel')
    .replace('{id}', String(index))
    .replace('{count}', String(house.members.length))
    .replace('{score}', String(house.score));

  // Maximum possible score (for bar width)
  const maxScore = 6;
  const scoreRatio = Math.min(house.score / maxScore, 1);

  // Header: House title + environment badge with emoji
  const header = el('div', { className: 'house-card-header', style: `border-bottom: 3px solid ${envColor}` },
    el('h3', { className: 'house-card-title' },
      `\uD83C\uDFE0 ${t('common.house')} #${index}`
    ),
    el('span', {
      className: `badge env-badge badge-env--${envSlug}`,
    }, `${envEmoji} ${translatedEnv}`)
  );

  // Score section with emoji and bar
  const scoreSection = el('div', { className: 'house-card-score' },
    el('div', { className: 'house-card-score-header' },
      el('span', { className: 'house-card-score-label' },
        `\u2B50 ${t('common.score')}`
      ),
      el('span', { className: 'house-card-score-value' }, String(house.score))
    ),
    el('div', { className: 'score-bar' },
      el('div', {
        className: 'score-bar__fill',
        style: `width: ${Math.round(scoreRatio * 100)}%; background-color: ${scoreColor(scoreRatio)}`,
      })
    )
  );

  // Residents as comma-separated list with paw icon
  const residentNames = house.members.map((member) => {
    const translated = t(`pokemon.${member.name}`) !== `pokemon.${member.name}`
      ? t(`pokemon.${member.name}`)
      : member.name;
    return translated;
  });

  const residentsSection = el('div', { className: 'house-card-section' },
    el('h4', { className: 'house-card-section-title' },
      `\uD83D\uDC3E ${t('common.residents')} (${house.members.length})`
    ),
    el('p', { className: 'house-card-residents' }, residentNames.join(', '))
  );

  // Shared preferences as colorful pills
  const sharedPills = el('div', { className: 'house-card-pills' });
  const pillColors = [
    '#e85d3a', '#3b82d6', '#2ea858', '#f5c518', '#6b3fa0', '#5cc5e8', '#c2956a',
  ];
  for (let i = 0; i < house.sharedPreferences.length; i++) {
    const pref = house.sharedPreferences[i];
    const color = pillColors[i % pillColors.length];
    sharedPills.appendChild(
      el('span', {
        className: 'house-card-pill',
        style: `background-color: ${color}15; color: ${color}; border: 1px solid ${color}40`,
      }, pref)
    );
  }

  const sharedSection = el('div', { className: 'house-card-section' },
    el('h4', { className: 'house-card-section-title' },
      `\u2728 ${t('common.sharedPrefs')}`
    ),
    house.sharedPreferences.length > 0
      ? sharedPills
      : el('span', { className: 'house-card-none' }, '-')
  );

  // Unique preferences count
  const uniqueSection = el('div', { className: 'house-card-section house-card-unique' },
    el('span', null,
      `\uD83D\uDD0D ${t('common.uniquePrefs')}: ${house.uniquePreferences.length}`
    )
  );

  return el('article', {
    className: `card house-card card--env-${envSlug}`,
    role: 'article',
    'aria-label': ariaLabel,
  },
    header,
    scoreSection,
    residentsSection,
    sharedSection,
    uniqueSection
  );
}

/**
 * Checks if a hex color needs dark text.
 * @param {string} hexColor
 * @returns {boolean}
 */
function luminanceCheck(hexColor) {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5;
}
