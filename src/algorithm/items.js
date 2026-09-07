/**
 * Concrete item suggestions for a house.
 *
 * Items carry several favorite categories (a plain stool is fabric, round,
 * soft and wooden at once), so a few well-chosen items can satisfy every
 * resident. Flavors (sweet, spicy, ...) are not decorations but food, so
 * they are represented by pseudo-items "food:<flavor>".
 */

export const FLAVORS = ['Choses sucrees', 'Choses epicees', 'Choses ameres', 'Choses acres', 'Choses acidulees'];
const FLAVOR_SET = new Set(FLAVORS);

/**
 * @typedef {Object} Item
 * @property {string} slug
 * @property {string} name
 * @property {string} [class]
 * @property {string[]} categories - preference keys (CSV keys)
 * @property {boolean} [food] - pseudo-item for a flavor
 */

/**
 * Converts the items.json object into a list with Sets for fast lookup.
 * @param {Record<string, {name: string, class?: string, categories: string[]}>} itemsJson
 * @returns {Item[]}
 */
export function prepareItems(itemsJson) {
  const list = Object.entries(itemsJson || {}).map(([slug, it]) => ({
    slug,
    name: it.name,
    class: it.class || '',
    categories: it.categories,
    categorySet: new Set(it.categories),
  }));
  for (const f of FLAVORS) {
    list.push({ slug: `food:${f}`, name: f, class: 'Food', categories: [f], categorySet: new Set([f]), food: true });
  }
  return list;
}

/**
 * Greedy set cover over real items: repeatedly picks the item that satisfies
 * the largest number of still-unmet (resident, favorite) pairs, until every
 * resident has `satisfy` favorites covered (or nothing helps any more).
 *
 * @param {Array<{name: string, preferences: string[]}>} members
 * @param {number} satisfy
 * @param {Item[]} items - from prepareItems()
 * @param {{owned?: Set<string> | null, preferCategories?: string[]}} [opts]
 *   owned: item slugs the player owns (null = everything); items not owned
 *   are skipped. preferCategories: the house's category shopping list, used
 *   as a tie-breaker so suggestions match the displayed categories.
 * @returns {{items: Array<{item: Item, covers: string[], residents: number[]}>, covered: number[], complete: boolean}}
 */
export function suggestItems(members, satisfy, items, opts = {}) {
  const owned = opts.owned || null;
  const prefer = new Set(opts.preferCategories || []);
  const need = members.map((m) => Math.min(satisfy, m.preferences.length));
  const have = members.map(() => new Set());
  const chosen = [];

  const unmet = () => members.some((_, i) => have[i].size < need[i]);

  while (unmet()) {
    let best = null;
    let bestGain = 0;
    let bestPrefer = -1;

    for (const item of items) {
      if (owned && !item.food && !owned.has(item.slug)) continue;
      let gain = 0;
      let preferHits = 0;
      for (let i = 0; i < members.length; i++) {
        if (have[i].size >= need[i]) continue;
        for (const p of members[i].preferences) {
          if (item.categorySet.has(p) && !have[i].has(p)) {
            gain++;
            if (prefer.has(p)) preferHits++;
          }
        }
      }
      if (gain === 0) continue;
      if (gain > bestGain
        || (gain === bestGain && preferHits > bestPrefer)
        || (gain === bestGain && preferHits === bestPrefer && best && item.categories.length < best.categories.length)) {
        best = item;
        bestGain = gain;
        bestPrefer = preferHits;
      }
    }

    if (!best) break;

    const covers = new Set();
    const residents = [];
    members.forEach((m, i) => {
      let hit = false;
      for (const p of m.preferences) {
        if (best.categorySet.has(p)) {
          if (have[i].size < need[i] && !have[i].has(p)) { have[i].add(p); covers.add(p); hit = true; }
          else if (have[i].has(p)) covers.add(p);
        }
      }
      if (hit) residents.push(i);
    });
    chosen.push({ item: best, covers: [...covers], residents });
  }

  return { items: chosen, covered: have.map((s) => s.size), complete: !unmet() };
}

/**
 * Items that carry a given category, sorted by how many of the house's
 * other needed categories they also cover.
 *
 * @param {string} category
 * @param {Item[]} items
 * @param {string[]} houseCategories - the house's category shopping list
 * @param {Set<string> | null} owned
 * @returns {Array<{item: Item, overlap: string[], owned: boolean}>}
 */
export function itemsForCategory(category, items, houseCategories, owned) {
  const wanted = new Set(houseCategories);
  return items
    .filter((it) => !it.food && it.categorySet.has(category))
    .map((it) => ({
      item: it,
      overlap: it.categories.filter((c) => c !== category && wanted.has(c)),
      owned: !owned || owned.has(it.slug),
    }))
    .sort((a, b) => (b.owned - a.owned) || (b.overlap.length - a.overlap.length) || a.item.name.localeCompare(b.item.name));
}

/** @param {string} key */
export function isFlavor(key) {
  return FLAVOR_SET.has(key);
}
