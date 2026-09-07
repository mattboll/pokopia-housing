import { buildHouse, DEFAULT_SATISFY } from './scoring.js';
import { coverCost } from './cover.js';

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
 * Greedy agglomerative clustering that minimizes the number of items to
 * place per house: each resident must get `satisfy` of its favorites, items
 * benefit everyone, so the cost of a house is its minimum item cover.
 *
 * All Pokemon in the input should share the same environment.
 *
 * @param {Array<{name: string, environment: string, preferences: string[]}>} pokemonGroup
 * @param {{maxSize?: number, satisfy?: number}} [options]
 * @returns {Array<ReturnType<typeof buildHouse>>}
 */
export function clusterByPreferences(pokemonGroup, options = {}) {
  const maxSize = options.maxSize ?? 4;
  const satisfy = options.satisfy ?? DEFAULT_SATISFY;

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
    let currentCost = coverCost(house, satisfy);

    while (house.length < maxSize) {
      let bestCandidate = null;
      let bestAdded = Infinity;
      let bestNewPrefs = Infinity;

      for (const candidate of sorted) {
        if (assigned.has(candidate)) continue;

        // Items the candidate forces us to add; tie-break on raw new preferences
        const added = coverCost([...house, candidate], satisfy) - currentCost;
        const newPrefs = newPrefsCount(existing, candidate);
        if (added < bestAdded || (added === bestAdded && newPrefs < bestNewPrefs)) {
          bestAdded = added;
          bestNewPrefs = newPrefs;
          bestCandidate = candidate;
        }
      }

      if (bestCandidate === null) break;

      house.push(bestCandidate);
      assigned.add(bestCandidate);
      for (const p of bestCandidate.preferences) existing.add(p);
      currentCost += bestAdded;
    }

    houses.push(buildHouse(house, false, satisfy));
  }

  return houses;
}
