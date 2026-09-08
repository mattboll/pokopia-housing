/**
 * Rates a house on the number of items to place, relative to the ideal
 * (everyone shares the same `satisfy` favorites = `satisfy` items) and the
 * worst case (nothing shared = `satisfy` items per resident).
 *
 * @param {{members: Array, cost?: number, satisfy?: number, uniquePreferences?: string[]}} house
 * @returns {{stars: number, key: string, color: string}}
 */
export function compatibilityRating(house) {
  const members = house.members.length;
  if (members <= 1) return { stars: 5, key: 'rating.perfect', color: '#2ea858' };

  const k = house.satisfy || 4;
  const cost = typeof house.cost === 'number' ? house.cost : (house.uniquePreferences || []).length;
  const ideal = k;
  const worst = k * members;
  const ratio = worst > ideal ? (cost - ideal) / (worst - ideal) : 0;

  if (ratio <= 0.15) return { stars: 5, key: 'rating.excellent', color: '#2ea858' };
  if (ratio <= 0.3) return { stars: 4, key: 'rating.veryGood', color: '#6bba4f' };
  if (ratio <= 0.5) return { stars: 3, key: 'rating.good', color: '#f5c518' };
  if (ratio <= 0.7) return { stars: 2, key: 'rating.okay', color: '#e5a419' };
  return { stars: 1, key: 'rating.low', color: '#e74c3c' };
}
