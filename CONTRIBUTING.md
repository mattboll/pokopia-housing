# Contributing to Pokopia Housing

Thanks for your interest in improving Pokopia Housing! This project is open to contributions of all kinds: bug fixes, algorithm improvements, translations, design tweaks, and new features.

## Getting Started

```bash
git clone https://github.com/mbollot/pokopia-housing.git
cd pokopia-housing
npm install
npm run dev
```

The site runs at `http://localhost:5173/pokopia-housing/`.

## Project Structure

```
src/
  algorithm/          # Housing optimization logic
    partition.js      #   Step 1: group Pokemon by environment
    scoring.js        #   Preference overlap functions (intersect, score, etc.)
    clustering.js     #   Step 2: greedy clustering within each group
    optimizer.js      #   Orchestrator that ties it all together
  core/               # App infrastructure
    data-loader.js    #   CSV parsing and data normalization
    i18n.js           #   Internationalization engine (5 languages)
    router.js         #   Hash-based SPA routing
    store.js          #   Reactive state management (pub/sub)
    theme.js          #   Dark/light mode toggle
  components/         # Reusable UI components
  pages/              # Page renderers (optimal, planner, legal)
  styles/             # CSS (tokens, theme, layout, components, pages)
  utils/              # Small helpers (DOM, debounce, a11y, CSV parser)
public/
  data/pokemon.csv    # Source data: 297 Pokemon with environment + preferences
  data/optimal-result.json  # Pre-computed optimal grouping (generated at build)
  i18n/*.json         # Locale files (ja, en, fr, de, es)
scripts/
  precompute-optimal.js  # Node script that generates optimal-result.json
```

## How the Algorithm Works

The optimizer solves a constrained clustering problem:

**Hard constraints:**
- Max 4 Pokemon per house
- All Pokemon in a house must share the same environment (Lumineux, Sombre, Chaud, Frais, Humide, Sec)

**Optimization goal:**
Maximize the number of shared preferences per house (= fewer unique furniture items needed in-game).

**Current approach: Greedy Agglomerative Clustering**

1. Partition all Pokemon by environment (6 independent subproblems)
2. Within each group, sort Pokemon by "average similarity" ascending — hardest-to-place Pokemon first
3. For each unassigned Pokemon (seed):
   - Create a new house
   - Greedily add the candidate that maximizes `houseScore` (= intersection of ALL members' preferences)
   - Stop when no candidate shares at least 1 preference with the group, or house is full (4)
4. Return all houses with shared/unique preference counts

**Current result:** 79 houses for 297 Pokemon, average score 2.19

### Known Limitations & Improvement Ideas

The greedy approach is fast but not globally optimal. It can get stuck in local optima because early grouping decisions constrain later ones. Ideas for improvement:

- **Simulated annealing**: randomly swap Pokemon between houses, accept worse swaps with decreasing probability
- **Genetic algorithm**: evolve a population of housing configurations
- **Integer Linear Programming (ILP)**: formalize as an optimization problem with GLPK.js or similar
- **Multi-pass refinement**: run greedy, then do pairwise swaps to improve score
- **Different scoring functions**: weight rare preferences higher, penalize houses with many unique items
- **Consider "disliked" items**: the game penalizes items a Pokemon dislikes — we could model this as negative overlap

If you want to try a new algorithm:
1. Create a new file in `src/algorithm/` (e.g. `annealing.js`)
2. Export a function with the same signature as `clusterByPreferences(pokemonGroup, maxSize)`
3. Wire it in `optimizer.js` (or make it selectable)
4. Run `npm run precompute` to regenerate the optimal result and compare stats

## Types of Contributions

### Bug Reports
Open an issue with:
- What you expected
- What happened instead
- Browser + OS + language used

### Algorithm Improvements
If you find a better grouping:
- Open an issue first to discuss the approach
- Include before/after stats (total houses, average score)
- The precompute script prints stats: `npm run precompute`

### Translations
- Locale files are in `public/i18n/`
- Each file has sections: `meta`, `nav`, `common`, `environments`, `preferences`, `pokemon`
- Pokemon names must use official localized names
- To add a new language: create the JSON file and add the locale code to `SUPPORTED_LOCALES` in `src/core/i18n.js`

### Data Corrections
- Pokemon data is in `public/data/pokemon.csv`
- If a Pokemon has wrong preferences or environment, fix the CSV and run `npm run precompute`
- Cite your source (Pokebip, Serebii, in-game screenshot, etc.)

### UI/Design
- Styles use CSS custom properties defined in `src/styles/tokens.css`
- Components are vanilla JS in `src/components/`
- No framework — keep it lightweight

## Pull Request Process

1. Fork the repo and create a branch from `main`
2. Make your changes
3. Run `npm run build` to verify everything compiles
4. Test in at least 2 languages (FR + EN)
5. Test both pages (Optimal + Planner)
6. Open a PR with a clear description of what and why

## Code Style

- Vanilla JS, ES modules, no framework
- Functions documented with JSDoc
- CSS uses BEM-like naming with the project's custom property system
- No external runtime dependencies (dev dependencies like Vite are fine)
- Keep bundle size small — this is a static site
