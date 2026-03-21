import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// ---------------------------------------------------------------------------
// CSV Parser
// ---------------------------------------------------------------------------

function parseCsv(csvText) {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];

  const pokemons = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    const name = cols[0].trim();
    const environment = cols[1].trim();
    const preferences = cols
      .slice(2)
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    if (name && environment) {
      pokemons.push({ name, environment, preferences });
    }
  }
  return pokemons;
}

// ---------------------------------------------------------------------------
// Scoring helpers (self-contained copy)
// ---------------------------------------------------------------------------

function intersect(arrA, arrB) {
  const setB = new Set(arrB);
  return arrA.filter((item) => setB.has(item));
}

function intersectAll(arrays) {
  if (arrays.length === 0) return [];
  if (arrays.length === 1) return [...arrays[0]];

  let result = new Set(arrays[0]);
  for (let i = 1; i < arrays.length; i++) {
    const current = new Set(arrays[i]);
    result = new Set([...result].filter((item) => current.has(item)));
  }
  return [...result];
}

function houseScore(members) {
  if (members.length === 0) return 0;
  return intersectAll(members.map((m) => m.preferences)).length;
}

function averageSimilarity(pokemon, group) {
  const others = group.filter((p) => p !== pokemon);
  if (others.length === 0) return 0;

  let total = 0;
  for (const other of others) {
    total += intersect(pokemon.preferences, other.preferences).length;
  }
  return total / others.length;
}

function uniquePreferences(members) {
  const set = new Set();
  for (const m of members) {
    for (const pref of m.preferences) {
      set.add(pref);
    }
  }
  return [...set];
}

// ---------------------------------------------------------------------------
// Partition
// ---------------------------------------------------------------------------

const ENVIRONMENTS = ['Lumineux', 'Sombre', 'Chaud', 'Frais', 'Humide', 'Sec'];

function partitionByEnvironment(pokemonList) {
  const groups = Object.fromEntries(ENVIRONMENTS.map((env) => [env, []]));

  for (const pokemon of pokemonList) {
    const env = pokemon.environment;
    if (groups[env]) {
      groups[env].push(pokemon);
    }
  }

  return groups;
}

// ---------------------------------------------------------------------------
// Clustering
// ---------------------------------------------------------------------------

function clusterByPreferences(pokemonGroup, maxSize = 4) {
  if (pokemonGroup.length === 0) return [];

  const sorted = [...pokemonGroup].sort(
    (a, b) =>
      averageSimilarity(a, pokemonGroup) -
      averageSimilarity(b, pokemonGroup),
  );

  const assigned = new Set();
  const houses = [];

  for (const seed of sorted) {
    if (assigned.has(seed)) continue;

    const house = [seed];
    assigned.add(seed);

    while (house.length < maxSize) {
      let bestCandidate = null;
      let bestScore = -1;

      for (const candidate of sorted) {
        if (assigned.has(candidate)) continue;

        const candidateScore = houseScore([...house, candidate]);
        if (candidateScore > bestScore) {
          bestScore = candidateScore;
          bestCandidate = candidate;
        }
      }

      if (bestScore < 1 || bestCandidate === null) break;

      house.push(bestCandidate);
      assigned.add(bestCandidate);
    }

    const shared = intersectAll(house.map((m) => m.preferences));
    houses.push({
      members: house,
      sharedPreferences: shared,
      score: shared.length,
      uniquePreferences: uniquePreferences(house),
    });
  }

  return houses;
}

// ---------------------------------------------------------------------------
// Optimizer
// ---------------------------------------------------------------------------

function optimize(pokemonList) {
  const groups = partitionByEnvironment(pokemonList);

  const environmentGroups = {};
  let totalHouses = 0;
  let totalPokemon = 0;
  let totalScore = 0;

  for (const [env, pokemons] of Object.entries(groups)) {
    if (pokemons.length === 0) continue;

    const houses = clusterByPreferences(pokemons, 4);

    environmentGroups[env] = {
      environment: env,
      houses,
      pokemonCount: pokemons.length,
      houseCount: houses.length,
    };

    totalHouses += houses.length;
    totalPokemon += pokemons.length;
    for (const house of houses) {
      totalScore += house.score;
    }
  }

  return {
    totalHouses,
    totalPokemon,
    averageScore: totalHouses > 0 ? totalScore / totalHouses : 0,
    environmentGroups,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const csvPath = join(projectRoot, 'public', 'data', 'pokemon.csv');
const outputPath = join(projectRoot, 'public', 'data', 'optimal-result.json');

console.log(`Reading CSV from ${csvPath}`);
const csvText = readFileSync(csvPath, 'utf-8');
const pokemonList = parseCsv(csvText);
console.log(`Parsed ${pokemonList.length} Pokemon`);

const result = optimize(pokemonList);

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8');
console.log(`Result written to ${outputPath}`);

console.log('\n--- Stats ---');
console.log(`Total Pokemon: ${result.totalPokemon}`);
console.log(`Total Houses:  ${result.totalHouses}`);
console.log(`Average Score: ${result.averageScore.toFixed(2)}`);

for (const [env, group] of Object.entries(result.environmentGroups)) {
  console.log(`  ${env}: ${group.pokemonCount} Pokemon -> ${group.houseCount} houses`);
}
