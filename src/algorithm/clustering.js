import {
  averageSimilarity,
  houseScore,
  intersectAll,
  uniquePreferences,
} from './scoring.js';

/**
 * Greedy agglomerative clustering of Pokemon by preference similarity.
 * All Pokemon in the input should share the same environment.
 *
 * @param {Array<{name: string, environment: string, preferences: string[]}>} pokemonGroup
 * @param {number} maxSize - Maximum house size (default 4)
 * @returns {Array<{members: Array, sharedPreferences: string[], score: number, uniquePreferences: string[]}>}
 */
export function clusterByPreferences(pokemonGroup, maxSize = 4) {
  if (pokemonGroup.length === 0) return [];

  // Sort by averageSimilarity ascending (least similar first = hardest to place)
  const sorted = [...pokemonGroup].sort(
    (a, b) =>
      averageSimilarity(a, pokemonGroup) -
      averageSimilarity(b, pokemonGroup),
  );

  const assigned = new Set();
  const houses = [];

  for (const seed of sorted) {
    if (assigned.has(seed)) continue;

    const house = [seed];
    assigned.add(seed);

    // Greedily add best candidate
    while (house.length < maxSize) {
      let bestCandidate = null;
      let bestScore = -1;

      for (const candidate of sorted) {
        if (assigned.has(candidate)) continue;

        const candidateScore = houseScore([...house, candidate]);
        if (candidateScore > bestScore) {
          bestScore = candidateScore;
          bestCandidate = candidate;
        }
      }

      // Stop if no candidate shares at least 1 preference with the whole house
      if (bestScore < 1 || bestCandidate === null) break;

      house.push(bestCandidate);
      assigned.add(bestCandidate);
    }

    const shared = intersectAll(house.map((m) => m.preferences));
    houses.push({
      members: house,
      sharedPreferences: shared,
      score: shared.length,
      uniquePreferences: uniquePreferences(house),
    });
  }

  return houses;
}
