const ENVIRONMENTS = ['Lumineux', 'Sombre', 'Chaud', 'Frais', 'Humide', 'Sec'];

/**
 * Partition a list of Pokemon by their environment.
 * @param {Array<{name: string, environment: string, preferences: string[]}>} pokemonList
 * @returns {Record<string, Array>}
 */
export function partitionByEnvironment(pokemonList) {
  const groups = Object.fromEntries(ENVIRONMENTS.map((env) => [env, []]));

  for (const pokemon of pokemonList) {
    const env = pokemon.environment;
    if (groups[env]) {
      groups[env].push(pokemon);
    }
  }

  return groups;
}
