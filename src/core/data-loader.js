import { parseCSV } from '../utils/csv-parser.js';

/**
 * @typedef {Object} Pokemon
 * @property {string} name
 * @property {string} environment
 * @property {string[]} preferences
 */

/**
 * Fetches and parses the Pokemon CSV data file.
 * CSV columns: Nom, Environnement, Preference 1..6
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
  const rows = parseCSV(csvText);

  return rows
    .map((row) => ({
      name: (row['Nom'] ?? '').trim(),
      environment: (row['Environnement'] ?? '').trim(),
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
