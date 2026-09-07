/**
 * Prints optimization statistics for the full Pokemon dataset.
 *
 * The site computes results in the browser (so that the DLC / event toggles
 * and the "minimum shared preferences" setting work), so this script is only
 * a convenience to check the algorithm and refresh the numbers in README.md.
 *
 * Usage: node scripts/precompute-optimal.js [--json out.json]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCSV } from '../src/utils/csv-parser.js';
import { rowsToPokemon } from '../src/core/data-loader.js';
import { optimize } from '../src/algorithm/optimizer.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

const csvPath = join(projectRoot, 'public', 'data', 'pokemon.csv');
const all = rowsToPokemon(parseCSV(readFileSync(csvPath, 'utf-8')));
console.log(`Parsed ${all.length} Pokemon from ${csvPath}`);

const scenarios = [
  { label: 'Base game only', list: all.filter((p) => p.source === 'base') },
  { label: 'Base + event', list: all.filter((p) => p.source !== 'basin') },
  { label: 'Everything (base + DLC + event)', list: all },
];

const summary = {};
for (const { label, list } of scenarios) {
  console.log(`\n=== ${label}: ${list.length} Pokemon ===`);
  console.log('minShared | houses | avg shared | avg compat | items to find');
  summary[label] = [];
  for (let minShared = 0; minShared <= 6; minShared++) {
    const r = optimize(list, { minShared });
    summary[label].push({ minShared, houses: r.totalHouses, averageScore: r.averageScore, averageCompatibility: r.averageCompatibility, itemsToFind: r.itemsToFind });
    console.log(
      `${String(minShared).padStart(9)} | ${String(r.totalHouses).padStart(6)} | ${r.averageScore.toFixed(2).padStart(10)} | ${(r.averageCompatibility * 100).toFixed(0).padStart(9)}% | ${String(r.itemsToFind).padStart(13)}`,
    );
  }
}

const full = optimize(all);
console.log('\nPer environment (everything, minShared 0):');
for (const [env, group] of Object.entries(full.environmentGroups)) {
  console.log(`  ${env}: ${group.pokemonCount} Pokemon -> ${group.houseCount} houses`);
}

const jsonIdx = process.argv.indexOf('--json');
if (jsonIdx !== -1 && process.argv[jsonIdx + 1]) {
  writeFileSync(process.argv[jsonIdx + 1], JSON.stringify(summary, null, 2));
  console.log(`\nSummary written to ${process.argv[jsonIdx + 1]}`);
}
