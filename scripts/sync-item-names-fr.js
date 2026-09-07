/**
 * Adds French item names to public/i18n/fr.json ("items" section) from
 * pokekalos.fr, which shows "Nom français / English name" on each item page.
 * Items are matched to public/data/items.json by their English name.
 *
 * Usage: node scripts/sync-item-names-fr.js [--refresh]
 * Pages are cached in .cache/pokekalos/ (about 1500 pages on first run).
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const REFRESH = process.argv.includes('--refresh');
const BASE = 'https://www.pokekalos.fr/jeux/switch2/pokopia/';
const CACHE_DIR = join(root, '.cache', 'pokekalos');

async function fetchText(url, cacheName) {
  const cachePath = join(CACHE_DIR, cacheName);
  if (!REFRESH && existsSync(cachePath)) return readFileSync(cachePath, 'utf-8');
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (pokopia-housing sync)' } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  const text = await res.text();
  mkdirSync(dirname(cachePath), { recursive: true });
  writeFileSync(cachePath, text);
  await new Promise((r) => setTimeout(r, 250));
  return text;
}

function textOf(html) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<[^>]+>/g, '|')
    .replace(/&amp;/g, '&').replace(/&#39;|&apos;|&rsquo;/g, '’').replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ')
    .replace(/&eacute;/g, 'é').replace(/&egrave;/g, 'è').replace(/&agrave;/g, 'à').replace(/&ecirc;/g, 'ê').replace(/&ccedil;/g, 'ç')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\|(\s*\|)+/g, '|');
}

const norm = (s) => s.toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, ' ').replace(/[^a-z0-9' ]/g, '').trim();

async function main() {
  const items = JSON.parse(readFileSync(join(root, 'public', 'data', 'items.json'), 'utf-8'));
  const slugByEn = new Map(Object.entries(items).map(([slug, it]) => [norm(it.name), slug]));

  const index = await fetchText(`${BASE}objets.html`, 'objets.html');
  const ids = [...new Set([...index.matchAll(/objet-(\d+)\.html/g)].map((m) => m[1]))];
  console.log(`${ids.length} item pages on pokekalos`);

  const frByEn = new Map();
  let n = 0;
  for (const id of ids) {
    let html;
    try { html = await fetchText(`${BASE}objet-${id}.html`, `objet-${id}.html`); } catch (e) { console.warn(`  ! ${id}: ${e.message}`); continue; }
    const t = textOf(html);
    const m = t.match(/\|([^|]{2,80})\| \/ \|([^|]{2,80})\|«/);
    if (m) frByEn.set(norm(m[2]), m[1].trim());
    if (++n % 200 === 0) console.log(`  ${n}/${ids.length}`);
  }

  const frPath = join(root, 'public', 'i18n', 'fr.json');
  const fr = JSON.parse(readFileSync(frPath, 'utf-8'));
  fr.items ||= {};
  // Colour variants ("Beautiful flower (pink)") are listed once on pokekalos, without the colour
  const COLOURS = { pink: 'rose', purple: 'violet', white: 'blanc', yellow: 'jaune', blue: 'bleu', orange: 'orange', red: 'rouge', green: 'vert', black: 'noir' };
  let matched = 0;
  const unmatched = [];
  for (const [slug, it] of Object.entries(items)) {
    let name = frByEn.get(norm(it.name));
    if (!name) {
      const m = it.name.match(/^(.*?)\s*\((\w+)\)$/);
      if (m && COLOURS[m[2].toLowerCase()]) {
        const base = frByEn.get(norm(m[1]));
        if (base) name = `${base} (${COLOURS[m[2].toLowerCase()]})`;
      }
    }
    if (name) { fr.items[slug] = name; matched++; } else unmatched.push(it.name);
  }
  // keep pokemon section last
  const pokemon = fr.pokemon; delete fr.pokemon; fr.pokemon = pokemon;
  writeFileSync(frPath, JSON.stringify(fr, null, 2) + '\n');
  console.log(`\nFrench names: ${matched}/${Object.keys(items).length} items matched, written to fr.json`);
  if (unmatched.length) console.log(`Unmatched (${unmatched.length}): ${unmatched.slice(0, 40).join(', ')}${unmatched.length > 40 ? ', ...' : ''}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
