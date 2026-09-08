const SPRITE_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/';

/** @type {Record<string, number | string>} */
let pokemonIds = {};

/**
 * Loads the Pokemon name -> sprite id mapping (once).
 * @returns {Promise<Record<string, number | string>>}
 */
export async function loadPokemonIds() {
  if (Object.keys(pokemonIds).length > 0) return pokemonIds;
  try {
    const base = import.meta.env.BASE_URL ?? '/pokopia-housing/';
    const resp = await fetch(`${base}data/pokemon-ids.json`);
    pokemonIds = resp.ok ? await resp.json() : {};
  } catch (e) {
    console.warn('Could not load pokemon IDs for sprites', e);
    pokemonIds = {};
  }
  return pokemonIds;
}

/**
 * Sprite URL for a Pokemon name (CSV key), or null when unknown.
 * @param {string} name
 * @returns {string | null}
 */
export function spriteUrl(name) {
  const id = pokemonIds[name];
  if (!id) return null;
  return `${SPRITE_BASE}${id}.png`;
}
