/**
 * Syncs Pokemon housing data from Serebii's Pokopia Pokedex.
 *
 * - Reads the slug lists (base game, Bubbly Basin, event), fetches each
 *   Pokemon page (cached in .cache/serebii/) and parses: ideal habitat,
 *   favorites (5 categories + 1 flavor), specialties, underwater.
 * - Compares with public/data/pokemon.csv and reports every difference.
 * - Without --dry-run, rewrites the CSV, pokemon-meta.json, and adds new
 *   Pokemon to the 5 locale files + pokemon-ids.json (names from PokeAPI).
 *
 * Usage:
 *   node scripts/sync-serebii.js            # apply
 *   node scripts/sync-serebii.js --dry-run  # report only
 *   node scripts/sync-serebii.js --refresh  # ignore the page cache
 *
 * Pokemon with alternate forms that are new (e.g. a future "X Form") are
 * reported but not added automatically: give them a CSV key by hand.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCSV } from '../src/utils/csv-parser.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has('--dry-run');
const REFRESH = args.has('--refresh');

const SEREBII = 'https://www.serebii.net';
const CACHE_DIR = join(root, '.cache', 'serebii');
const LISTS = [
  ['availablepokemon', 'base'],
  ['basinpokedex', 'basin'],
  ['eventpokedex', 'event'],
];
const ENVS = { Bright: 'Lumineux', Dark: 'Sombre', Warm: 'Chaud', Cool: 'Frais', Humid: 'Humide', Dry: 'Sec' };
const FLAVORS = {
  'sweet flavors': 'Choses sucrees', 'bitter flavors': 'Choses ameres', 'dry flavors': 'Choses acres',
  'sour flavors': 'Choses acidulees', 'spicy flavors': 'Choses epicees',
};
const LOCALES = ['ja', 'en', 'fr', 'de', 'es'];
const NAME_ALIASES = { 'Stereo Rotom': 'Motisma' };
const REGION_BY_SOURCE = { basin: 'bubbly-basin', event: 'event' };

// ---------------------------------------------------------------------------
// Fetch with cache
// ---------------------------------------------------------------------------

async function fetchText(url, cacheName) {
  const cachePath = join(CACHE_DIR, cacheName);
  if (!REFRESH && existsSync(cachePath)) return readFileSync(cachePath, 'utf-8');
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (pokopia-housing sync)' } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  const text = await res.text();
  mkdirSync(dirname(cachePath), { recursive: true });
  writeFileSync(cachePath, text);
  return text;
}

async function fetchJson(url, cacheName) {
  return JSON.parse(await fetchText(url, cacheName));
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

function decodeEntities(s) {
  return s.replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"')
    .replace(/&eacute;/g, 'é').replace(/&nbsp;/g, ' ').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function htmlToCells(html) {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, '|');
  return decodeEntities(text).split('|').map((c) => c.trim()).filter((c) => c.length > 0);
}

/**
 * @returns {{name: string, env: string, favorites: string[], flavor: string, specialties: string[], underwater: boolean} | null}
 */
function parsePokemonPage(html, categoriesLower) {
  const cells = htmlToCells(html);
  const idx = cells.indexOf('Specialty');
  if (idx === -1) return null;

  const nameMatch = html.match(/#\d+ ([^<|]+?)\s*<\/td>|#\d+ ([^|<]+)/);
  const picIdx = cells.indexOf('Picture');
  const name = picIdx > 0 ? cells[picIdx - 1].replace(/^#\d+\s+/, '') : (nameMatch?.[1] || nameMatch?.[2] || '').trim();

  // skip the header cells (Specialty | Ideal Habitat | Favorites | Go Underwater?)
  let i = idx;
  while (['Specialty', 'Ideal Habitat', 'Favorites', 'Go Underwater?'].includes(cells[i])) i++;
  const values = cells.slice(i, i + 16);

  const specialties = [];
  let env = null;
  const favorites = [];
  let flavor = null;
  let underwater = false;
  for (const v of values) {
    if (!env) {
      if (ENVS[v]) env = v; else specialties.push(v);
      continue;
    }
    const lower = v.toLowerCase();
    if (categoriesLower.has(lower)) favorites.push(categoriesLower.get(lower));
    else if (FLAVORS[lower]) flavor = FLAVORS[lower];
    else if (lower === 'underwater capable') underwater = true;
    else if (lower === 'habitats & locations' || lower === 'game names') break;
  }
  if (!env) return null;
  return { name, env, favorites, flavor, specialties, underwater };
}

// ---------------------------------------------------------------------------
// Name matching (Serebii English name  <->  CSV key = French name, no accents)
// ---------------------------------------------------------------------------

function stripAccents(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function serebiiNameFromDisplay(enName) {
  return enName.replace(' ♂', ' Male Form').replace(' ♀', ' Female Form').replace(/ \(/g, ' ').replace(/\)/g, '');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const csvPath = join(root, 'public', 'data', 'pokemon.csv');
  const metaPath = join(root, 'public', 'data', 'pokemon-meta.json');
  const idsPath = join(root, 'public', 'data', 'pokemon-ids.json');
  const localePath = (l) => join(root, 'public', 'i18n', `${l}.json`);

  const locales = Object.fromEntries(LOCALES.map((l) => [l, JSON.parse(readFileSync(localePath(l), 'utf-8'))]));
  const en = locales.en;
  const categoriesLower = new Map(Object.entries(en.preferences).map(([key, label]) => [label.toLowerCase(), key]));
  const keyByEnName = new Map(Object.entries(en.pokemon).map(([key, label]) => [serebiiNameFromDisplay(label), key]));
  for (const [alias, key] of Object.entries(NAME_ALIASES)) keyByEnName.set(alias, key);

  const rows = parseCSV(readFileSync(csvPath, 'utf-8'));
  const csvByKey = new Map(rows.map((r) => [r['Nom'], r]));
  const meta = existsSync(metaPath) ? JSON.parse(readFileSync(metaPath, 'utf-8')) : {};
  const ids = JSON.parse(readFileSync(idsPath, 'utf-8'));

  // 1. Slug lists
  const slugs = new Map(); // slug -> source
  for (const [page, source] of LISTS) {
    const html = await fetchText(`${SEREBII}/pokemonpokopia/${page}.shtml`, `${page}.html`);
    for (const m of html.matchAll(/\/pokemonpokopia\/pokedex\/([a-z0-9-]+)\.shtml/g)) {
      if (!slugs.has(m[1])) slugs.set(m[1], source);
    }
  }
  console.log(`Serebii lists: ${slugs.size} Pokemon`);

  // 2. Pages
  const parsed = new Map(); // slug -> data
  let n = 0;
  for (const slug of slugs.keys()) {
    const html = await fetchText(`${SEREBII}/pokemonpokopia/pokedex/${slug}.shtml`, `pokedex/${slug}.html`);
    const data = parsePokemonPage(html, categoriesLower);
    if (data && data.favorites.length === 5 && data.flavor) parsed.set(slug, data);
    else if (slug !== 'ditto') console.warn(`  ! could not parse ${slug}`);
    if (++n % 50 === 0) console.log(`  ${n}/${slugs.size} pages`);
  }

  // 3. Compare / apply
  const report = { updated: [], added: [], unknownForms: [], missingOnSerebii: [] };
  const seenKeys = new Set();

  for (const [slug, data] of parsed) {
    const source = slugs.get(slug);
    const prefs = [...data.favorites, data.flavor].sort();
    const env = ENVS[data.env];
    let key = keyByEnName.get(data.name);

    if (!key) {
      // New Pokemon: needs localized names from PokeAPI
      if (/ (Male|Female) Form$| Form$| Sea$/.test(data.name)) {
        report.unknownForms.push({ slug, name: data.name, env, prefs, source });
        continue;
      }
      const apiSlug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, '');
      let species;
      try {
        species = await fetchJson(`https://pokeapi.co/api/v2/pokemon-species/${apiSlug}`, `pokeapi/${apiSlug}.json`);
      } catch {
        report.unknownForms.push({ slug, name: data.name, env, prefs, source, note: 'no PokeAPI species' });
        continue;
      }
      const names = Object.fromEntries(species.names.map((x) => [x.language.name, x.name]));
      key = stripAccents(names.fr || names.en);
      for (const l of LOCALES) locales[l].pokemon[key] = names[l] || names.en;
      ids[key] = species.id;
      report.added.push({ key, name: data.name, env, prefs, source });
    }

    seenKeys.add(key);
    const row = csvByKey.get(key);
    const rowPrefs = row ? [1, 2, 3, 4, 5, 6].map((i) => row[`Preference ${i}`]).filter(Boolean).sort() : null;
    const rowSource = row?.['Source'] || 'base';
    const changed = !row || row['Environnement'] !== env || rowSource !== source || JSON.stringify(rowPrefs) !== JSON.stringify(prefs);
    if (row && changed) report.updated.push({ key, before: { env: row['Environnement'], source: rowSource, prefs: rowPrefs }, after: { env, source, prefs } });

    const newRow = { Nom: key, Environnement: env, Source: source };
    prefs.forEach((p, i) => { newRow[`Preference ${i + 1}`] = p; });
    for (let i = prefs.length + 1; i <= 6; i++) newRow[`Preference ${i}`] = '';
    if (row) Object.assign(row, newRow);
    else { rows.push(newRow); csvByKey.set(key, newRow); }

    meta[key] = {
      region: meta[key]?.region || REGION_BY_SOURCE[source] || 'unknown',
      specialties: data.specialties,
      underwater: data.underwater,
    };
  }

  for (const key of csvByKey.keys()) {
    if (!seenKeys.has(key)) report.missingOnSerebii.push(key);
  }

  // 4. Report
  console.log(`\nUpdated: ${report.updated.length}`);
  for (const u of report.updated) {
    console.log(`  ${u.key}: ${u.before.env}/${u.before.source} [${u.before.prefs?.join(', ')}]`);
    console.log(`      -> ${u.after.env}/${u.after.source} [${u.after.prefs.join(', ')}]`);
  }
  console.log(`Added: ${report.added.length}`);
  for (const a of report.added) console.log(`  ${a.key} (${a.name}) ${a.env}/${a.source}`);
  console.log(`Needs manual handling (forms / no PokeAPI entry): ${report.unknownForms.length}`);
  for (const f of report.unknownForms) console.log(`  ${f.slug}: ${f.name} ${f.env}/${f.source} [${f.prefs.join(', ')}] ${f.note || ''}`);
  console.log(`In CSV but not on Serebii (kept): ${report.missingOnSerebii.length}`);
  for (const k of report.missingOnSerebii) console.log(`  ${k}`);

  if (DRY_RUN) {
    console.log('\n--dry-run: nothing written');
    return;
  }

  // 5. Write
  const header = ['Nom', 'Environnement', 'Source', 'Preference 1', 'Preference 2', 'Preference 3', 'Preference 4', 'Preference 5', 'Preference 6'];
  const csv = [header.join(','), ...rows.map((r) => header.map((h) => r[h] ?? '').join(','))].join('\n') + '\n';
  writeFileSync(csvPath, csv);
  writeFileSync(metaPath, JSON.stringify(meta, null, 1) + '\n');
  writeFileSync(idsPath, JSON.stringify(ids, null, 2) + '\n');
  for (const l of LOCALES) writeFileSync(localePath(l), JSON.stringify(locales[l], null, 2) + '\n');
  console.log('\nFiles written. Run `npm run stats` and `npm run build` to check.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
