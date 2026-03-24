import {
  intersectAll,
  uniquePreferences,
} from './scoring.js';

/**
 * Counts how many NEW preferences a candidate would add to a house.
 * Lower = better (the candidate's preferences overlap more with existing ones).
 *
 * @param {Array<{preferences: string[]}>} house - current members
 * @param {{preferences: string[]}} candidate
 * @returns {number} number of new unique preferences the candidate would add
 */
function newPrefsCount(house, candidate) {
  const existing = new Set();
  for (const m of house) {
    for (const p of m.preferences) existing.add(p);
  }
  let added = 0;
  for (const p of candidate.preferences) {
    if (!existing.has(p)) added++;
  }
  return added;
}

/**
 * Average number of new preferences a pokemon would add to each other
 * pokemon's set. Lower = more overlap = easier to place.
 *
 * @param {{preferences: string[]}} pokemon
 * @param {Array<{preferences: string[]}>} group
 * @returns {number}
 */
function averageNewPrefs(pokemon, group) {
  const others = group.filter((p) => p !== pokemon);
  if (others.length === 0) return 0;

  const myPrefs = new Set(pokemon.preferences);
  let total = 0;
  for (const other of others) {
    const otherPrefs = new Set(other.preferences);
    // How many of my prefs are NOT in other's prefs?
    let unique = 0;
    for (const p of myPrefs) {
      if (!otherPrefs.has(p)) unique++;
    }
    total += unique;
  }
  return total / others.length;
}

/**
 * Greedy agglomerative clustering that minimizes the total number of
 * unique preferences per house (= fewer different items to find).
 *
 * All Pokemon in the input should share the same environment.
 *
 * @param {Array<{name: string, environment: string, preferences: string[]}>} pokemonGroup
 * @param {number} maxSize - Maximum house size (default 4)
 * @returns {Array<{members: Array, sharedPreferences: string[], score: number, uniquePreferences: string[]}>}
 */
export function clusterByPreferences(pokemonGroup, maxSize = 4) {
  if (pokemonGroup.length === 0) return [];

  // Sort by averageNewPrefs descending: Pokemon that add the most new
  // preferences to others are hardest to place, so we seed them first
  const sorted = [...pokemonGroup].sort(
    (a, b) =>
      averageNewPrefs(b, pokemonGroup) -
      averageNewPrefs(a, pokemonGroup),
  );

  const assigned = new Set();
  const houses = [];

  for (const seed of sorted) {
    if (assigned.has(seed)) continue;

    const house = [seed];
    assigned.add(seed);

    // Greedily add the candidate that adds the FEWEST new preferences
    while (house.length < maxSize) {
      let bestCandidate = null;
      let bestNewCount = Infinity;

      for (const candidate of sorted) {
        if (assigned.has(candidate)) continue;

        const added = newPrefsCount(house, candidate);
        if (added < bestNewCount) {
          bestNewCount = added;
          bestCandidate = candidate;
        }
      }

      if (bestCandidate === null) break;

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
