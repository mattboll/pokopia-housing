import { partitionByEnvironment } from './partition.js';
import { clusterByPreferences } from './clustering.js';
import { improveHouses } from './improve.js';
import { buildHouse } from './scoring.js';

/**
 * @typedef {Object} OptimizeOptions
 * @property {number} [maxSize=4] - Maximum residents per house
 * @property {number} [minShared=0] - Every house must keep at least this many
 *   preferences liked by ALL residents (0 = fewest houses, 6 = solo houses)
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
 * @returns {{totalHouses: number, totalPokemon: number, averageScore: number, averageCompatibility: number, itemsToFind: number, environmentGroups: Object}}
 */
export function optimize(pokemonList, options = {}) {
  const maxSize = options.maxSize ?? 4;
  const minShared = options.minShared ?? 0;
  const improve = options.improve ?? true;
  const lockedHouses = options.lockedHouses ?? [];

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
  let totalCompat = 0;
  let itemsToFind = 0;

  const envOrder = Object.keys(groups);
  for (const env of envOrder) {
    const pokemons = groups[env];
    const locked = lockedHouses
      .filter((h) => h.members.length > 0 && h.members[0].environment === env)
      .map((h) => buildHouse([...h.members], true));

    if (pokemons.length === 0 && locked.length === 0) continue;

    let houses = clusterByPreferences(pokemons, { maxSize, minShared });
    if (improve && houses.length > 1) {
      houses = improveHouses(houses, { maxSize, minShared });
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
      totalCompat += house.compatibility;
      itemsToFind += house.uniquePreferences.length;
    }
  }

  return {
    totalHouses,
    totalPokemon,
    averageScore: totalHouses > 0 ? totalScore / totalHouses : 0,
    averageCompatibility: totalHouses > 0 ? totalCompat / totalHouses : 0,
    itemsToFind,
    environmentGroups,
  };
}
