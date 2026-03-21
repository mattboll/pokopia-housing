import { el } from '../utils/dom.js';
import { t } from '../core/i18n.js';

/**
 * Environment color mapping for badges.
 */
const ENV_COLORS = {
  Lumineux: '#f4d03f',
  Sombre: '#7d3c98',
  Chaud: '#e74c3c',
  Frais: '#3498db',
  Humide: '#1abc9c',
  Sec: '#e67e22',
};

/**
 * Creates a compact Pokemon card DOM element.
 *
 * @param {{name: string, environment: string, preferences: string[]}} pokemon
 * @returns {HTMLElement}
 */
export function createPokemonCard(pokemon) {
  const translatedName = t(`pokemon.${pokemon.name}`) !== `pokemon.${pokemon.name}`
    ? t(`pokemon.${pokemon.name}`)
    : pokemon.name;

  const envColor = ENV_COLORS[pokemon.environment] || '#95a5a6';
  const translatedEnv = t(`environments.${pokemon.environment}`) !== `environments.${pokemon.environment}`
    ? t(`environments.${pokemon.environment}`)
    : pokemon.environment;

  const envBadge = el('span', {
    className: 'badge env-badge',
    style: `background-color: ${envColor}; color: ${needsDarkText(envColor) ? '#1a1a1a' : '#fff'}`,
  }, translatedEnv);

  const prefTags = el('div', { className: 'card-tags' });
  for (const pref of pokemon.preferences.slice(0, 4)) {
    prefTags.appendChild(el('span', { className: 'tag' }, pref));
  }
  if (pokemon.preferences.length > 4) {
    prefTags.appendChild(el('span', { className: 'tag tag-more' }, `+${pokemon.preferences.length - 4}`));
  }

  return el('article', { className: 'card pokemon-card' },
    el('div', { className: 'card-header' },
      el('span', { className: 'card-name' }, translatedName),
      envBadge
    ),
    prefTags
  );
}

/**
 * Determines if dark text should be used on a given background color.
 * @param {string} hexColor
 * @returns {boolean}
 */
function needsDarkText(hexColor) {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
}
