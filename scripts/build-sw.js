/**
 * Generates dist/sw.js from scripts/sw.template.js with the list of files
 * to precache and a version derived from their contents.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const dist = join(projectRoot, 'dist');
const BASE = '/pokopia-housing/';

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

const files = walk(dist)
  .map((f) => relative(dist, f).split('\\').join('/'))
  .filter((f) => !['sw.js', 'robots.txt', 'sitemap.xml'].includes(f) && !f.endsWith('.map'));

const template = readFileSync(join(__dirname, 'sw.template.js'), 'utf-8');

const hash = createHash('sha256').update(template);
for (const f of files.sort()) hash.update(f).update(readFileSync(join(dist, f)));
const version = hash.digest('hex').slice(0, 12);

const precache = [BASE, ...files.filter((f) => f !== 'index.html').map((f) => BASE + f)];
const sw = template
  .replace('__VERSION__', version)
  .replace('__BASE__', BASE)
  .replace('__PRECACHE__', JSON.stringify(precache, null, 2));

writeFileSync(join(dist, 'sw.js'), sw);
console.log(`sw.js written: version ${version}, ${precache.length} files precached`);
