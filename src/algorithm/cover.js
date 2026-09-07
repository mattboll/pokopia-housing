/**
 * Minimum item cover for a house.
 *
 * In Pokopia every item placed in a house benefits all residents, and a
 * resident does not need ALL of its favorites to be happy. Given k (the
 * number of favorites each resident should have satisfied), the cost of a
 * house is the smallest number of item categories that gives every resident
 * at least k of its favorites.
 *
 * Solved exactly: categories liked by several residents are enumerated with
 * a small dynamic program over "how many favorites each resident already
 * has" (at most (k+1)^4 states), categories liked by a single resident only
 * top up that resident at the end.
 */

/** @type {Map<string, {cost: number, items: string[], covered: number[]}>} */
const memo = new Map();

/** Clears the memoization cache (call before an optimization run). */
export function clearCoverCache() {
  memo.clear();
}

/**
 * @param {Array<{name: string, preferences: string[]}>} members
 * @param {number} k - favorites to satisfy per resident (1..6)
 * @returns {{cost: number, items: string[], covered: number[]}}
 *   cost = number of categories, items = which ones, covered[i] = how many
 *   of member i's favorites are covered by `items`
 */
export function minCover(members, k) {
  const n = members.length;
  if (n === 0) return { cost: 0, items: [], covered: [] };

  const key = `${k}|${members.map((m) => m.name).sort().join('|')}`;
  const cached = memo.get(key);
  if (cached) return cached;

  const need = members.map((m) => Math.min(k, m.preferences.length));
  const base = k + 1;

  // Category -> bitmask of residents who like it
  const maskOf = new Map();
  members.forEach((m, i) => {
    for (const p of m.preferences) maskOf.set(p, (maskOf.get(p) || 0) | (1 << i));
  });

  const privateCats = Array.from({ length: n }, () => []);
  const groups = new Map(); // mask -> categories (popcount >= 2)
  for (const [cat, mask] of maskOf) {
    if ((mask & (mask - 1)) === 0) {
      privateCats[Math.log2(mask)].push(cat);
    } else {
      if (!groups.has(mask)) groups.set(mask, []);
      groups.get(mask).push(cat);
    }
  }
  const groupList = [...groups.entries()];

  const encode = (counts) => counts.reduce((acc, c, i) => acc + c * base ** i, 0);
  const decode = (code) => {
    const counts = new Array(n);
    for (let i = 0; i < n; i++) { counts[i] = code % base; code = Math.floor(code / base); }
    return counts;
  };

  // DP over shared categories: code -> { cost, parent, group, taken }
  let states = new Map([[encode(new Array(n).fill(0)), { cost: 0, parent: -1, group: -1, taken: 0 }]]);
  groupList.forEach(([mask, cats], g) => {
    const next = new Map(states);
    for (const [code, st] of states) {
      let counts = decode(code);
      for (let taken = 1; taken <= cats.length; taken++) {
        let changed = false;
        counts = counts.map((c, i) => {
          if ((mask & (1 << i)) && c < need[i]) { changed = true; return c + 1; }
          return c;
        });
        if (!changed) break;
        const code2 = encode(counts);
        const cost2 = st.cost + taken;
        const existing = next.get(code2);
        if (!existing || existing.cost > cost2) {
          next.set(code2, { cost: cost2, parent: code, group: g, taken });
        }
      }
    }
    states = next;
  });

  // Top up with private categories, pick the best final state
  let best = null;
  for (const [code, st] of states) {
    const counts = decode(code);
    let total = st.cost;
    let feasible = true;
    for (let i = 0; i < n; i++) {
      const deficit = need[i] - counts[i];
      if (deficit > privateCats[i].length) { feasible = false; break; }
      total += Math.max(0, deficit);
    }
    if (feasible && (!best || total < best.total)) best = { code, total, counts };
  }

  // Reconstruct the chosen categories
  const items = [];
  let code = best.code;
  while (true) {
    const st = states.get(code);
    if (!st || st.parent === -1) break;
    items.push(...groupList[st.group][1].slice(0, st.taken));
    code = st.parent;
  }
  // The chain above only walks states created in the last group each was set in;
  // states that were carried over unchanged keep their original parent, so the
  // walk is correct across groups.
  for (let i = 0; i < n; i++) {
    const deficit = need[i] - best.counts[i];
    if (deficit > 0) items.push(...privateCats[i].slice(0, deficit));
  }

  const itemSet = new Set(items);
  const covered = members.map((m) => m.preferences.filter((p) => itemSet.has(p)).length);
  const result = { cost: best.total, items, covered };
  memo.set(key, result);
  return result;
}

/**
 * Cost only (number of items to place) for a house.
 * @param {Array<{name: string, preferences: string[]}>} members
 * @param {number} k
 */
export function coverCost(members, k) {
  return members.length === 0 ? 0 : minCover(members, k).cost;
}
