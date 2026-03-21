import {
  averageSimilarity,
  enhancedHouseScore,
  uniquePreferences,
} from './scoring.js';

/**
 * Greedy agglomerative clustering of Pokemon by preference compatibility.
 * Uses enhanced scoring that considers both direct preference matches
 * AND bridged preferences (two different preferences satisfiable by one item).
 *
 * All Pokemon in the input should share the same environment.
 *
 * @param {Array<{name: string, environment: string, preferences: string[]}>} pokemonGroup
 * @param {number} maxSize - Maximum house size (default 4)
 * @returns {Array<{members: Array, sharedPreferences: string[], bridges: Array, score: number, bridgeScore: number, uniquePreferences: string[]}>}
 */
export function clusterByPreferences(pokemonGroup, maxSize = 4) {
  if (pokemonGroup.length === 0) return [];

  // Sort by averageSimilarity ascending (least compatible first = hardest to place)
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

    // Greedily add best candidate using enhanced scoring
    while (house.length < maxSize) {
      let bestCandidate = null;
      let bestScore = -1;

      for (const candidate of sorted) {
        if (assigned.has(candidate)) continue;

        const result = enhancedHouseScore([...house, candidate]);
        if (result.totalScore > bestScore) {
          bestScore = result.totalScore;
          bestCandidate = candidate;
        }
      }

      // Stop if no candidate has any compatibility (direct or bridged)
      if (bestScore < 1 || bestCandidate === null) break;

      house.push(bestCandidate);
      assigned.add(bestCandidate);
    }

    const result = enhancedHouseScore(house);
    houses.push({
      members: house,
      sharedPreferences: result.sharedPreferences,
      bridges: result.bridges,
      score: result.directScore,
      bridgeScore: result.bridgeScore,
      totalScore: result.totalScore,
      uniquePreferences: uniquePreferences(house),
    });
  }

  return houses;
}
