import { partitionByEnvironment } from './partition.js';
import { clusterByPreferences } from './clustering.js';
import { improveHouses } from './improve.js';
import { buildHouse, DEFAULT_SATISFY } from './scoring.js';
import { clearCoverCache } from './cover.js';

/**
 * @typedef {Object} OptimizeOptions
 * @property {number} [maxSize=4] - Maximum residents per house
 * @property {number} [satisfy=4] - Favorites to satisfy per resident (1..6).
 *   The cost of a house is the minimum number of item categories giving
 *   every resident that many favorites.
 * @property {boolean} [improve=true] - Run the local-search refinement pass
 * @property {Array<{members: Array}>} [lockedHouses=[]] - Houses kept as-is;
 *   their members are excluded from the optimization
 */

/**
 * Run the full optimization pipeline:
 * 1. Partition Pokemon by environment
 * 2. Greedy clustering of each environment group
 * 3. Local-search refinement (swaps / moves between houses)
 * 4. Return a summary result object
 *
 * @param {Array<{name: string, environment: string, preferences: string[]}>} pokemonList
 * @param {OptimizeOptions} [options]
 * @returns {{totalHouses: number, totalPokemon: number, averageScore: number, itemsToPlace: number, maxItems: number, satisfy: number, environmentGroups: Object}}
 */
export function optimize(pokemonList, options = {}) {
  const maxSize = options.maxSize ?? 4;
  const satisfy = options.satisfy ?? DEFAULT_SATISFY;
  const improve = options.improve ?? true;
  const lockedHouses = options.lockedHouses ?? [];

  clearCoverCache();

  const lockedNames = new Set();
  for (const h of lockedHouses) {
    for (const m of h.members) lockedNames.add(m.name);
  }

  const free = pokemonList.filter((p) => !lockedNames.has(p.name));
  const groups = partitionByEnvironment(free);

  const environmentGroups = {};
  let totalHouses = 0;
  let totalPokemon = 0;
  let totalScore = 0;
  let itemsToPlace = 0;
  let maxItems = 0;

  const envOrder = Object.keys(groups);
  for (const env of envOrder) {
    const pokemons = groups[env];
    const locked = lockedHouses
      .filter((h) => h.members.length > 0 && h.members[0].environment === env)
      .map((h) => buildHouse([...h.members], true, satisfy));

    if (pokemons.length === 0 && locked.length === 0) continue;

    let houses = clusterByPreferences(pokemons, { maxSize, satisfy });
    if (improve && houses.length > 1) {
      houses = improveHouses(houses, { maxSize, satisfy });
    }
    houses = [...locked, ...houses];

    const pokemonCount = houses.reduce((n, h) => n + h.members.length, 0);
    environmentGroups[env] = {
      environment: env,
      houses,
      pokemonCount,
      houseCount: houses.length,
    };

    totalHouses += houses.length;
    totalPokemon += pokemonCount;
    for (const house of houses) {
      totalScore += house.score;
      itemsToPlace += house.cost;
      if (house.cost > maxItems) maxItems = house.cost;
    }
  }

  return {
    totalHouses,
    totalPokemon,
    averageScore: totalHouses > 0 ? totalScore / totalHouses : 0,
    itemsToPlace,
    maxItems,
    satisfy,
    environmentGroups,
  };
}
