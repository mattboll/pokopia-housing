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
 * Returns the average number of shared preferences between a pokemon
 * and each other pokemon in the group.
 * @param {{preferences: string[]}} pokemon
 * @param {Array<{preferences: string[]}>} group
 * @returns {number}
 */
export function averageSimilarity(pokemon, group) {
  const others = group.filter((p) => p !== pokemon);
  if (others.length === 0) return 0;

  let total = 0;
  for (const other of others) {
    total += intersect(pokemon.preferences, other.preferences).length;
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
