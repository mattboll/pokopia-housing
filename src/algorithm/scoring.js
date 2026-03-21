/**
 * Preference link graph — loaded from preference-links.json.
 * Maps each preference to an array of preferences it can be bridged with.
 * null until loadPreferenceLinks() is called.
 * @type {Map<string, Set<string>> | null}
 */
let prefGraph = null;

/**
 * Loads the preference links graph from the JSON file.
 * Must be called before using bridged scoring functions.
 * @returns {Promise<void>}
 */
export async function loadPreferenceLinks() {
  if (prefGraph) return;
  try {
    const base = typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL
      ? import.meta.env.BASE_URL
      : '/pokopia-housing/';
    const response = await fetch(`${base}data/preference-links.json`);
    const data = await response.json();
    prefGraph = new Map();
    for (const [pref, linked] of Object.entries(data.links)) {
      prefGraph.set(pref, new Set(linked));
    }
  } catch (e) {
    console.warn('Could not load preference links, falling back to exact matching', e);
    prefGraph = new Map();
  }
}

/**
 * Sets the preference graph directly (for Node.js precompute script).
 * @param {Record<string, string[]>} links
 */
export function setPreferenceLinks(links) {
  prefGraph = new Map();
  for (const [pref, linked] of Object.entries(links)) {
    prefGraph.set(pref, new Set(linked));
  }
}

/**
 * Checks if two preferences are linked (bridgeable via a shared item).
 * @param {string} prefA
 * @param {string} prefB
 * @returns {boolean}
 */
export function arePrefsLinked(prefA, prefB) {
  if (prefA === prefB) return true;
  if (!prefGraph) return false;
  return prefGraph.get(prefA)?.has(prefB) || prefGraph.get(prefB)?.has(prefA) || false;
}

// ===================================================================
// Core set operations (unchanged)
// ===================================================================

/**
 * Returns the intersection of two arrays.
 * @param {string[]} arrA
 * @param {string[]} arrB
 * @returns {string[]}
 */
export function intersect(arrA, arrB) {
  const setB = new Set(arrB);
  return arrA.filter((item) => setB.has(item));
}

/**
 * Returns the intersection of N arrays.
 * @param {string[][]} arrays
 * @returns {string[]}
 */
export function intersectAll(arrays) {
  if (arrays.length === 0) return [];
  if (arrays.length === 1) return [...arrays[0]];

  let result = new Set(arrays[0]);
  for (let i = 1; i < arrays.length; i++) {
    const current = new Set(arrays[i]);
    result = new Set([...result].filter((item) => current.has(item)));
  }
  return [...result];
}

// ===================================================================
// Enhanced scoring with preference bridges
// ===================================================================

/**
 * Counts how many preference bridges exist between two Pokemon.
 * A bridge = prefA from pokemon1 is linked to prefB from pokemon2 (but prefA != prefB).
 * This is IN ADDITION to direct shared preferences.
 *
 * @param {{preferences: string[]}} pokemonA
 * @param {{preferences: string[]}} pokemonB
 * @returns {{directMatches: string[], bridges: Array<{from: string, to: string}>, totalScore: number}}
 */
export function pairCompatibility(pokemonA, pokemonB) {
  const directMatches = intersect(pokemonA.preferences, pokemonB.preferences);
  const directSet = new Set(directMatches);

  const bridges = [];
  if (prefGraph) {
    for (const prefA of pokemonA.preferences) {
      if (directSet.has(prefA)) continue; // skip already directly matched
      for (const prefB of pokemonB.preferences) {
        if (directSet.has(prefB)) continue;
        if (prefA === prefB) continue;
        if (arePrefsLinked(prefA, prefB)) {
          bridges.push({ from: prefA, to: prefB });
        }
      }
    }
  }

  // Direct matches are strongly preferred (guaranteed shared item)
  // Bridges are a bonus (an item might cover both, but less certain)
  const totalScore = directMatches.length * 5 + bridges.length;

  return { directMatches, bridges, totalScore };
}

/**
 * Scores a house of N Pokemon using both direct matches and bridges.
 * Direct = preferences shared by ALL members (intersection).
 * Bridged = for each pair of members, count preference bridges.
 *
 * @param {Array<{preferences: string[]}>} members
 * @returns {{directScore: number, bridgeScore: number, totalScore: number, sharedPreferences: string[], bridges: Array<{from: string, to: string}>}}
 */
export function enhancedHouseScore(members) {
  if (members.length === 0) return { directScore: 0, bridgeScore: 0, totalScore: 0, sharedPreferences: [], bridges: [] };

  const sharedPreferences = intersectAll(members.map((m) => m.preferences));
  const directScore = sharedPreferences.length;

  // Collect unique bridges across all pairs
  const bridgeSet = new Set();
  const bridges = [];
  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      const compat = pairCompatibility(members[i], members[j]);
      for (const b of compat.bridges) {
        const key = [b.from, b.to].sort().join('↔');
        if (!bridgeSet.has(key)) {
          bridgeSet.add(key);
          bridges.push(b);
        }
      }
    }
  }

  const bridgeScore = bridges.length;
  const totalScore = directScore * 5 + bridgeScore;

  return { directScore, bridgeScore, totalScore, sharedPreferences, bridges };
}

// ===================================================================
// Legacy scoring (kept for backward compatibility)
// ===================================================================

/**
 * Returns the number of shared preferences among ALL members of a house.
 * @param {Array<{preferences: string[]}>} members
 * @returns {number}
 */
export function houseScore(members) {
  if (members.length === 0) return 0;
  const shared = intersectAll(members.map((m) => m.preferences));
  return shared.length;
}

/**
 * Returns the average compatibility score between a pokemon and each other in the group.
 * Uses enhanced scoring (direct + bridges) when preference links are loaded.
 * @param {{preferences: string[]}} pokemon
 * @param {Array<{preferences: string[]}>} group
 * @returns {number}
 */
export function averageSimilarity(pokemon, group) {
  const others = group.filter((p) => p !== pokemon);
  if (others.length === 0) return 0;

  let total = 0;
  for (const other of others) {
    const compat = pairCompatibility(pokemon, other);
    total += compat.totalScore;
  }
  return total / others.length;
}

/**
 * Returns the union (total distinct preferences) of all members.
 * @param {Array<{preferences: string[]}>} members
 * @returns {string[]}
 */
export function uniquePreferences(members) {
  const set = new Set();
  for (const m of members) {
    for (const pref of m.preferences) {
      set.add(pref);
    }
  }
  return [...set];
}
