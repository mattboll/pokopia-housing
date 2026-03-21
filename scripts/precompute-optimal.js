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
// Preference Links (loaded from JSON)
// ---------------------------------------------------------------------------

let prefGraph = null;

function loadLinks() {
  try {
    const linksPath = join(projectRoot, 'public', 'data', 'preference-links.json');
    const data = JSON.parse(readFileSync(linksPath, 'utf-8'));
    prefGraph = new Map();
    for (const [pref, linked] of Object.entries(data.links)) {
      prefGraph.set(pref, new Set(linked));
    }
    console.log(`Loaded ${prefGraph.size} preference link entries`);
  } catch (e) {
    console.warn('Could not load preference links:', e.message);
    prefGraph = new Map();
  }
}

function arePrefsLinked(prefA, prefB) {
  if (prefA === prefB) return true;
  if (!prefGraph) return false;
  return prefGraph.get(prefA)?.has(prefB) || prefGraph.get(prefB)?.has(prefA) || false;
}

// ---------------------------------------------------------------------------
// Scoring helpers
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

function pairCompatibility(pokemonA, pokemonB) {
  const directMatches = intersect(pokemonA.preferences, pokemonB.preferences);
  const directSet = new Set(directMatches);

  const bridges = [];
  if (prefGraph) {
    for (const prefA of pokemonA.preferences) {
      if (directSet.has(prefA)) continue;
      for (const prefB of pokemonB.preferences) {
        if (directSet.has(prefB)) continue;
        if (prefA === prefB) continue;
        if (arePrefsLinked(prefA, prefB)) {
          bridges.push({ from: prefA, to: prefB });
        }
      }
    }
  }

  return { directMatches, bridges, totalScore: directMatches.length * 5 + bridges.length };
}

function enhancedHouseScore(members) {
  if (members.length === 0) return { directScore: 0, bridgeScore: 0, totalScore: 0, sharedPreferences: [], bridges: [] };

  const sharedPreferences = intersectAll(members.map((m) => m.preferences));
  const directScore = sharedPreferences.length;

  const bridgeSet = new Set();
  const bridges = [];
  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      const compat = pairCompatibility(members[i], members[j]);
      for (const b of compat.bridges) {
        const key = [b.from, b.to].sort().join('\u2194');
        if (!bridgeSet.has(key)) {
          bridgeSet.add(key);
          bridges.push(b);
        }
      }
    }
  }

  return { directScore, bridgeScore: bridges.length, totalScore: directScore * 5 + bridges.length, sharedPreferences, bridges };
}

function averageSimilarity(pokemon, group) {
  const others = group.filter((p) => p !== pokemon);
  if (others.length === 0) return 0;

  let total = 0;
  for (const other of others) {
    total += pairCompatibility(pokemon, other).totalScore;
  }
  return total / others.length;
}

function uniquePreferences(members) {
  const set = new Set();
  for (const m of members) {
    for (const pref of m.preferences) set.add(pref);
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
    if (groups[pokemon.environment]) groups[pokemon.environment].push(pokemon);
  }
  return groups;
}

// ---------------------------------------------------------------------------
// Clustering (enhanced with bridges)
// ---------------------------------------------------------------------------

function clusterByPreferences(pokemonGroup, maxSize = 4) {
  if (pokemonGroup.length === 0) return [];

  const sorted = [...pokemonGroup].sort(
    (a, b) => averageSimilarity(a, pokemonGroup) - averageSimilarity(b, pokemonGroup),
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
        const result = enhancedHouseScore([...house, candidate]);
        if (result.totalScore > bestScore) {
          bestScore = result.totalScore;
          bestCandidate = candidate;
        }
      }

      if (bestScore < 1 || bestCandidate === null) break;
      house.push(bestCandidate);
      assigned.add(bestCandidate);
    }

    const result = enhancedHouseScore(house);
    houses.push({
      members: house,
      sharedPreferences: result.sharedPreferences,
      bridges: result.bridges,
      score: result.directScore,
      bridgeScore: result.bridgeScore,
      totalScore: result.totalScore,
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
  let totalDirectScore = 0;
  let totalCombinedScore = 0;

  for (const [env, pokemons] of Object.entries(groups)) {
    if (pokemons.length === 0) continue;

    const houses = clusterByPreferences(pokemons, 4);

    environmentGroups[env] = { environment: env, houses, pokemonCount: pokemons.length, houseCount: houses.length };

    totalHouses += houses.length;
    totalPokemon += pokemons.length;
    for (const house of houses) {
      totalDirectScore += house.score;
      totalCombinedScore += house.totalScore;
    }
  }

  return {
    totalHouses,
    totalPokemon,
    averageScore: totalHouses > 0 ? totalDirectScore / totalHouses : 0,
    averageTotalScore: totalHouses > 0 ? totalCombinedScore / totalHouses : 0,
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

// Load preference links for enhanced scoring
loadLinks();

const result = optimize(pokemonList);

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8');
console.log(`Result written to ${outputPath}`);

console.log('\n--- Stats ---');
console.log(`Total Pokemon: ${result.totalPokemon}`);
console.log(`Total Houses:  ${result.totalHouses}`);
console.log(`Average Direct Score: ${result.averageScore.toFixed(2)}`);
console.log(`Average Total Score (direct + bridges): ${result.averageTotalScore.toFixed(2)}`);

for (const [env, group] of Object.entries(result.environmentGroups)) {
  console.log(`  ${env}: ${group.pokemonCount} Pokemon -> ${group.houseCount} houses`);
}
