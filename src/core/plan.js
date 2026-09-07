/**
 * "My village" plan: the editable set of houses produced by the planner,
 * persisted in localStorage and shareable through a compressed URL.
 */
import { buildHouse } from '../algorithm/scoring.js';

export const PLAN_KEY = 'pokopia-housing-plan';
const VERSION = 1;

let nextId = 1;

/** @returns {string} */
export function newHouseId() {
  return `h${Date.now().toString(36)}${(nextId++).toString(36)}`;
}

/**
 * @typedef {Object} PlanHouse
 * @property {string} id
 * @property {string[]} members - Pokemon names (CSV keys)
 * @property {boolean} locked
 */

/**
 * @typedef {Object} Plan
 * @property {number} version
 * @property {PlanHouse[]} houses
 * @property {number} updatedAt
 */

/** @returns {Plan} */
export function emptyPlan() {
  return { version: VERSION, houses: [], updatedAt: Date.now() };
}

/** @returns {Plan} */
export function loadPlan() {
  try {
    const raw = localStorage.getItem(PLAN_KEY);
    if (raw) return normalizePlan(JSON.parse(raw));
  } catch { /* ignore */ }
  return emptyPlan();
}

/** @param {Plan} plan */
export function savePlan(plan) {
  try {
    plan.updatedAt = Date.now();
    localStorage.setItem(PLAN_KEY, JSON.stringify(plan));
  } catch { /* ignore */ }
}

export function clearPlan() {
  try { localStorage.removeItem(PLAN_KEY); } catch { /* ignore */ }
}

/**
 * Validates / repairs a plan object coming from storage, a file or a link.
 * @param {any} raw
 * @returns {Plan}
 */
export function normalizePlan(raw) {
  const plan = emptyPlan();
  if (!raw || !Array.isArray(raw.houses)) return plan;
  const seen = new Set();
  for (const h of raw.houses) {
    if (!h || !Array.isArray(h.members)) continue;
    const members = h.members.filter((m) => typeof m === 'string' && !seen.has(m));
    members.forEach((m) => seen.add(m));
    if (members.length === 0) continue;
    plan.houses.push({ id: typeof h.id === 'string' ? h.id : newHouseId(), members, locked: Boolean(h.locked) });
  }
  return plan;
}

/**
 * Converts an optimizer result into plan houses. Locked houses passed to the
 * optimizer are recognised by member identity and keep their id.
 *
 * @param {{environmentGroups: Object}} result
 * @param {PlanHouse[]} lockedHouses
 * @returns {PlanHouse[]}
 */
export function resultToPlanHouses(result, lockedHouses) {
  const lockedByKey = new Map(lockedHouses.map((h) => [[...h.members].sort().join('|'), h]));
  const houses = [];
  for (const group of Object.values(result.environmentGroups)) {
    for (const house of group.houses) {
      const names = house.members.map((m) => m.name);
      const key = [...names].sort().join('|');
      const locked = house.locked ? lockedByKey.get(key) : null;
      houses.push(locked ? { ...locked, members: names } : { id: newHouseId(), members: names, locked: false });
    }
  }
  return houses;
}

/**
 * Resolves plan houses into renderable house objects grouped by environment.
 * Unknown names (data changed since the plan was saved) are dropped.
 *
 * @param {Plan} plan
 * @param {Map<string, {name: string, environment: string, preferences: string[]}>} byName
 * @returns {Record<string, Array>} environment -> houses (with id + locked)
 */
export function planToEnvironmentHouses(plan, byName) {
  const groups = {};
  for (const h of plan.houses) {
    const members = h.members.map((n) => byName.get(n)).filter(Boolean);
    if (members.length === 0) continue;
    const env = members[0].environment;
    const house = buildHouse(members, h.locked);
    house.id = h.id;
    (groups[env] ||= []).push(house);
  }
  return groups;
}

// ---------------------------------------------------------------------------
// Share links: JSON -> deflate -> base64url (falls back to plain base64url)
// ---------------------------------------------------------------------------

function toBase64Url(bytes) {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(str) {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (str.length % 4)) % 4);
  const bin = atob(b64);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function pipe(bytes, stream) {
  const resp = new Response(new Blob([bytes]).stream().pipeThrough(stream));
  return new Uint8Array(await resp.arrayBuffer());
}

/**
 * @param {{selected: string[], plan: Plan, options?: Object}} state
 * @returns {Promise<string>} token to put in the URL
 */
export async function encodeShare(state) {
  const payload = {
    v: VERSION,
    s: state.selected,
    h: state.plan.houses.map((h) => ({ m: h.members, l: h.locked ? 1 : 0 })),
    o: state.options || {},
  };
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  if (typeof CompressionStream === 'function') {
    try {
      return 'd' + toBase64Url(await pipe(bytes, new CompressionStream('deflate-raw')));
    } catch { /* fall through */ }
  }
  return 'j' + toBase64Url(bytes);
}

/**
 * @param {string} token
 * @returns {Promise<{selected: string[], plan: Plan, options: Object} | null>}
 */
export async function decodeShare(token) {
  try {
    const kind = token[0];
    let bytes = fromBase64Url(token.slice(1));
    if (kind === 'd') bytes = await pipe(bytes, new DecompressionStream('deflate-raw'));
    const payload = JSON.parse(new TextDecoder().decode(bytes));
    const plan = normalizePlan({ houses: (payload.h || []).map((h) => ({ members: h.m, locked: h.l === 1 })) });
    const selected = Array.isArray(payload.s) ? payload.s.filter((n) => typeof n === 'string') : [];
    return { selected, plan, options: payload.o && typeof payload.o === 'object' ? payload.o : {} };
  } catch {
    return null;
  }
}
