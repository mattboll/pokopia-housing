import { buildHouse, houseCost, houseScore } from './scoring.js';

/**
 * Compares two (cost, shared) evaluations. Negative = `a` is better.
 * Primary: fewer items to find that don't please everyone.
 * Secondary: more preferences shared by everyone.
 */
function better(costA, sharedA, costB, sharedB) {
  if (costA !== costB) return costA - costB;
  return sharedB - sharedA;
}

/**
 * Local-search refinement of a greedy clustering: repeatedly tries to
 * swap two Pokemon between houses, or move one Pokemon into another house,
 * keeping any change that lowers the total cost. Houses left empty are
 * dropped, so the pass can also reduce the number of houses.
 *
 * All houses must belong to the same environment.
 *
 * @param {Array<{members: Array}>} houses
 * @param {{maxSize?: number, minShared?: number, maxPasses?: number}} [options]
 * @returns {Array<ReturnType<typeof buildHouse>>}
 */
export function improveHouses(houses, options = {}) {
  const maxSize = options.maxSize ?? 4;
  const minShared = options.minShared ?? 0;
  const maxPasses = options.maxPasses ?? 30;

  const groups = houses.map((h) => [...h.members]);
  const valid = (members) => members.length === 0 || houseScore(members) >= minShared;

  for (let pass = 0; pass < maxPasses; pass++) {
    let improved = false;

    for (let i = 0; i < groups.length; i++) {
      for (let j = i + 1; j < groups.length; j++) {
        const A = groups[i];
        const B = groups[j];
        const baseCost = houseCost(A) + houseCost(B);
        const baseShared = houseScore(A) + houseScore(B);

        let bestMove = null;
        let bestCost = baseCost;
        let bestShared = baseShared;

        // Candidate moves: swap a<->b, move a->B, move b->A (null = nothing)
        for (let ai = -1; ai < A.length; ai++) {
          for (let bi = -1; bi < B.length; bi++) {
            if (ai === -1 && bi === -1) continue;

            const newA = A.filter((_, k) => k !== ai);
            const newB = B.filter((_, k) => k !== bi);
            if (bi >= 0) newA.push(B[bi]);
            if (ai >= 0) newB.push(A[ai]);

            if (newA.length > maxSize || newB.length > maxSize) continue;
            if (!valid(newA) || !valid(newB)) continue;

            const cost = houseCost(newA) + houseCost(newB);
            const shared = houseScore(newA) + houseScore(newB);
            // Emptying a house is always worth it at equal cost
            const emptiesOne = (newA.length === 0 || newB.length === 0) && A.length > 0 && B.length > 0;

            if (better(cost, shared, bestCost, bestShared) < 0 || (emptiesOne && cost <= bestCost)) {
              bestMove = { newA, newB };
              bestCost = cost;
              bestShared = shared;
            }
          }
        }

        if (bestMove) {
          groups[i] = bestMove.newA;
          groups[j] = bestMove.newB;
          improved = true;
        }
      }
    }

    // Drop emptied houses
    for (let k = groups.length - 1; k >= 0; k--) {
      if (groups[k].length === 0) groups.splice(k, 1);
    }

    if (!improved) break;
  }

  return groups.map((members) => buildHouse(members));
}
