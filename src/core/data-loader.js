import { parseCSV } from '../utils/csv-parser.js';

/**
 * @typedef {Object} Pokemon
 * @property {string} name
 * @property {string} environment
 * @property {'base'|'basin'|'event'} source - base game, Bubbly Basin DLC, or event
 * @property {string[]} preferences
 */

/**
 * Converts parsed CSV rows into Pokemon objects.
 * CSV columns: Nom, Environnement, Source, Preference 1..6
 *
 * @param {Object[]} rows
 * @returns {Pokemon[]}
 */
export function rowsToPokemon(rows) {
  return rows
    .map((row) => ({
      name: (row['Nom'] ?? '').trim(),
      environment: (row['Environnement'] ?? '').trim(),
      source: (row['Source'] ?? 'base').trim() || 'base',
      preferences: [
        row['Preference 1'],
        row['Preference 2'],
        row['Preference 3'],
        row['Preference 4'],
        row['Preference 5'],
        row['Preference 6'],
      ]
        .map((p) => (p ?? '').trim())
        .filter((p) => p.length > 0),
    }))
    .filter((p) => p.name.length > 0);
}

/**
 * Fetches and parses the Pokemon CSV data file.
 *
 * @returns {Promise<Pokemon[]>} Parsed array of Pokemon objects
 */
export async function loadPokemonData() {
  const base = import.meta.env.BASE_URL ?? '/pokopia-housing/';
  const url = `${base}data/pokemon.csv`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load Pokemon data: ${response.status}`);
  }

  const csvText = await response.text();
  return rowsToPokemon(parseCSV(csvText));
}

/** @type {Record<string, {region: string, specialties: string[], underwater: boolean}> | null} */
let metaCache = null;

/**
 * Loads extra per-Pokemon game info (region, specialties, underwater).
 * Missing file = empty object, never throws.
 *
 * @returns {Promise<Record<string, {region: string, specialties: string[], underwater: boolean}>>}
 */
export async function loadPokemonMeta() {
  if (metaCache) return metaCache;
  try {
    const base = import.meta.env.BASE_URL ?? '/pokopia-housing/';
    const response = await fetch(`${base}data/pokemon-meta.json`);
    metaCache = response.ok ? await response.json() : {};
  } catch {
    metaCache = {};
  }
  return metaCache;
}

/**
 * Loads the item catalog (items.json: name, class, favorite categories).
 * Missing file = empty object, never throws.
 *
 * @returns {Promise<Record<string, {name: string, class?: string, categories: string[]}>>}
 */
export async function loadItems() {
  try {
    const base = import.meta.env.BASE_URL ?? '/pokopia-housing/';
    const response = await fetch(`${base}data/items.json`);
    return response.ok ? await response.json() : {};
  } catch {
    return {};
  }
}
