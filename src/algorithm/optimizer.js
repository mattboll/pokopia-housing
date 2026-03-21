import { partitionByEnvironment } from './partition.js';
import { clusterByPreferences } from './clustering.js';

/**
 * Run the full optimization pipeline:
 * 1. Partition Pokemon by environment
 * 2. Cluster each environment group by preference compatibility (direct + bridged)
 * 3. Return a summary result object
 *
 * @param {Array<{name: string, environment: string, preferences: string[]}>} pokemonList
 * @returns {{
 *   totalHouses: number,
 *   totalPokemon: number,
 *   averageScore: number,
 *   averageTotalScore: number,
 *   environmentGroups: Record<string, {
 *     environment: string,
 *     houses: Array,
 *     pokemonCount: number,
 *     houseCount: number
 *   }>
 * }}
 */
export function optimize(pokemonList) {
  const groups = partitionByEnvironment(pokemonList);

  const environmentGroups = {};
  let totalHouses = 0;
  let totalPokemon = 0;
  let totalDirectScore = 0;
  let totalCombinedScore = 0;

  for (const [env, pokemons] of Object.entries(groups)) {
    if (pokemons.length === 0) continue;

    const houses = clusterByPreferences(pokemons, 4);

    environmentGroups[env] = {
      environment: env,
      houses,
      pokemonCount: pokemons.length,
      houseCount: houses.length,
    };

    totalHouses += houses.length;
    totalPokemon += pokemons.length;
    for (const house of houses) {
      totalDirectScore += house.score;
      totalCombinedScore += (house.totalScore || house.score);
    }
  }

  return {
    totalHouses,
    totalPokemon,
    averageScore: totalHouses > 0 ? totalDirectScore / totalHouses : 0,
    averageTotalScore: totalHouses > 0 ? totalCombinedScore / totalHouses : 0,
    environmentGroups,
  };
}
