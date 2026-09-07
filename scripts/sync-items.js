/**
 * Builds public/data/items.json from Serebii's "Favorites" pages: for each of
 * the 43 favorite categories, the list of items that belong to it. An item
 * listed under several categories gets all of them (a round wooden table is
 * both "Wooden stuff" and "Round stuff").
 *
 * public/data/items-overrides.json is merged on top: use it to add missing
 * items, fix categories, or hide an item ("remove": true).
 *
 * Usage: node scripts/sync-items.js [--refresh]
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const REFRESH = process.argv.includes('--refresh');
const SEREBII = 'https://www.serebii.net';
const CACHE_DIR = join(root, '.cache', 'serebii', 'favorites');

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

function decode(s) {
  return s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"')
    .replace(/&eacute;/g, 'é').replace(/&nbsp;/g, ' ').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))).trim();
}

const ROW = /<tr>\s*<td class="cen"><a href="\/pokemonpokopia\/items\/([^"]+)\.shtml">.*?<\/td>\s*<td class="cen"><a[^>]*><u>([^<]+)<\/u><\/a><\/td>\s*<td class="fooinfo">(.*?)<\/td>\s*<td class="cen">(.*?)<\/td>/gs;

async function main() {
  const en = JSON.parse(readFileSync(join(root, 'public', 'i18n', 'en.json'), 'utf-8'));
  const keyByLabel = new Map(Object.entries(en.preferences).map(([k, v]) => [v.toLowerCase(), k]));

  const index = await fetchText(`${SEREBII}/pokemonpokopia/favorites.shtml`, 'index.html');
  const slugs = [...new Set([...index.matchAll(/\/pokemonpokopia\/favorites\/([a-z]+)\.shtml/g)].map((m) => m[1]))];
  console.log(`${slugs.length} favorite categories`);

  const items = {};
  for (const slug of slugs) {
    const html = await fetchText(`${SEREBII}/pokemonpokopia/favorites/${slug}.shtml`, `${slug}.html`);
    const title = decode((html.match(/<title>([^<]+)<\/title>/) || [])[1] || '').replace(/ Favorites.*$/, '').trim();
    const key = keyByLabel.get(title.toLowerCase());
    if (!key) { console.warn(`  ! unknown category "${title}" (${slug})`); continue; }

    // Only the items table (the page also lists Pokemon who like the category)
    const second = html.indexOf('List of ', html.indexOf('List of ') + 8);
    const block = second === -1 ? html : html.slice(0, second);

    let n = 0;
    for (const m of block.matchAll(ROW)) {
      const [, itemSlug, name, , klass] = m;
      const it = items[itemSlug] ||= { name: decode(name), class: '', categories: [] };
      const k = decode(klass);
      if (k && !it.class) it.class = k;
      if (!it.categories.includes(key)) it.categories.push(key);
      n++;
    }
    console.log(`  ${title}: ${n} items`);
  }

  // Overrides
  const overridesPath = join(root, 'public', 'data', 'items-overrides.json');
  if (existsSync(overridesPath)) {
    const overrides = JSON.parse(readFileSync(overridesPath, 'utf-8'));
    for (const [slug, o] of Object.entries(overrides)) {
      if (slug.startsWith('_')) continue;
      if (o.remove) { delete items[slug]; continue; }
      const it = items[slug] ||= { name: o.name || slug, class: '', categories: [] };
      if (o.name) it.name = o.name;
      if (o.class) it.class = o.class;
      if (Array.isArray(o.categories)) it.categories = [...new Set(o.categories)];
      if (Array.isArray(o.add)) it.categories = [...new Set([...it.categories, ...o.add])];
    }
  }

  const sorted = Object.fromEntries(Object.entries(items).sort((a, b) => a[1].name.localeCompare(b[1].name)));
  const out = join(root, 'public', 'data', 'items.json');
  writeFileSync(out, JSON.stringify(sorted, null, 1) + '\n');
  const multi = Object.values(sorted).filter((i) => i.categories.length > 1).length;
  console.log(`\n${Object.keys(sorted).length} items written to ${out} (${multi} with 2+ categories)`);
}

main().catch((err) => { console.error(err); process.exit(1); });
