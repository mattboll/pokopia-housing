import { buildHouse } from './scoring.js';

/**
 * Counts how many NEW preferences a candidate would add to a house.
 * Lower = better (the candidate's preferences overlap more with existing ones).
 *
 * @param {Set<string>} existing - union of the current members' preferences
 * @param {{preferences: string[]}} candidate
 * @returns {number}
 */
function newPrefsCount(existing, candidate) {
  let added = 0;
  for (const p of candidate.preferences) {
    if (!existing.has(p)) added++;
  }
  return added;
}

/**
 * Number of preferences that would still be shared by everyone if the
 * candidate joined the house.
 *
 * @param {Set<string>} shared - preferences shared by all current members
 * @param {{preferences: string[]}} candidate
 * @returns {number}
 */
function sharedAfter(shared, candidate) {
  let count = 0;
  for (const p of candidate.preferences) {
    if (shared.has(p)) count++;
  }
  return count;
}

/**
 * Average number of new preferences a pokemon would add to each other
 * pokemon's set. Higher = less overlap = harder to place.
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
    let unique = 0;
    for (const p of myPrefs) {
      if (!otherPrefs.has(p)) unique++;
    }
    total += unique;
  }
  return total / others.length;
}

/**
 * Greedy agglomerative clustering that minimizes the number of distinct
 * preferences per house (= fewer different items to find), while
 * guaranteeing that every house keeps at least `minShared` preferences
 * liked by ALL its residents.
 *
 * All Pokemon in the input should share the same environment.
 *
 * @param {Array<{name: string, environment: string, preferences: string[]}>} pokemonGroup
 * @param {{maxSize?: number, minShared?: number}} [options]
 * @returns {Array<ReturnType<typeof buildHouse>>}
 */
export function clusterByPreferences(pokemonGroup, options = {}) {
  const maxSize = options.maxSize ?? 4;
  const minShared = options.minShared ?? 0;

  if (pokemonGroup.length === 0) return [];

  // Seed with the hardest-to-place Pokemon first
  const sorted = [...pokemonGroup].sort(
    (a, b) => averageNewPrefs(b, pokemonGroup) - averageNewPrefs(a, pokemonGroup),
  );

  const assigned = new Set();
  const houses = [];

  for (const seed of sorted) {
    if (assigned.has(seed)) continue;

    const house = [seed];
    assigned.add(seed);
    const existing = new Set(seed.preferences);
    let shared = new Set(seed.preferences);

    while (house.length < maxSize) {
      let bestCandidate = null;
      let bestNewCount = Infinity;
      let bestShared = -1;

      for (const candidate of sorted) {
        if (assigned.has(candidate)) continue;

        const keptShared = sharedAfter(shared, candidate);
        if (keptShared < minShared) continue;

        const added = newPrefsCount(existing, candidate);
        if (added < bestNewCount || (added === bestNewCount && keptShared > bestShared)) {
          bestNewCount = added;
          bestShared = keptShared;
          bestCandidate = candidate;
        }
      }

      if (bestCandidate === null) break;

      house.push(bestCandidate);
      assigned.add(bestCandidate);
      for (const p of bestCandidate.preferences) existing.add(p);
      shared = new Set(bestCandidate.preferences.filter((p) => shared.has(p)));
    }

    houses.push(buildHouse(house));
  }

  return houses;
}
