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
    scoring.js        #   Preference overlap functions (intersect, buildHouse, houseCost)
    clustering.js     #   Step 2: greedy clustering within each group (minShared aware)
    improve.js        #   Step 3: local search (swaps / moves between houses)
    optimizer.js      #   Orchestrator that ties it all together (locked houses, options)
  core/               # App infrastructure
    data-loader.js    #   CSV parsing and data normalization
    plan.js           #   "My village" plan: persistence, share links
    pwa.js            #   Service worker registration, install prompt
    i18n.js           #   Internationalization engine (5 languages)
    router.js         #   Hash-based SPA routing
    store.js          #   Reactive state management (pub/sub)
    theme.js          #   Dark/light mode toggle
  components/         # Reusable UI components
  pages/              # Page renderers (optimal, planner, legal)
  styles/             # CSS (tokens, theme, layout, components, pages)
  utils/              # Small helpers (DOM, debounce, a11y, CSV parser)
public/
  data/pokemon.csv    # Source data: 360 Pokemon (base + DLC + event) with environment, source, preferences
  data/pokemon-meta.json  # Region, specialties, dive ability
  data/pokemon-ids.json   # Sprite ids (PokeAPI)
  i18n/*.json         # Locale files (ja, en, fr, de, es)
scripts/
  precompute-optimal.js  # Statistics for the dataset (npm run stats)
  sync-serebii.js        # Data sync from Serebii (npm run sync)
  build-sw.js            # Generates the service worker after vite build
```

## How the Algorithm Works

The optimizer solves a constrained clustering problem:

**Hard constraints:**
- Max 4 Pokemon per house
- All Pokemon in a house must share the same environment (Lumineux, Sombre, Chaud, Frais, Humide, Sec)

**Optimization goal:**
Minimize, per house, the number of distinct items that do not please every resident (`houseCost = |union| - |intersection|`), and as a tie-breaker maximize the preferences shared by everyone.

**Current approach: greedy clustering + local search**

1. Partition all Pokemon by environment (6 independent subproblems)
2. Within each group, seed houses with the hardest-to-place Pokemon first and greedily add the candidate that adds the fewest new preferences (`clustering.js`)
3. Refine with swaps and moves between houses while the total cost decreases (`improve.js`)
4. Optional `minShared`: a candidate may only join if at least N preferences stay shared by all residents

**Current result:** 92 houses for 360 Pokemon, average 2.16 shared preferences (`npm run stats` prints the table for every `minShared` value)

### Known Limitations & Improvement Ideas

The greedy approach is fast but not globally optimal. It can get stuck in local optima because early grouping decisions constrain later ones. Ideas for improvement:

- **Simulated annealing**: randomly swap Pokemon between houses, accept worse swaps with decreasing probability
- **Genetic algorithm**: evolve a population of housing configurations
- **Integer Linear Programming (ILP)**: formalize as an optimization problem with GLPK.js or similar
- **Different scoring functions**: weight rare preferences higher, penalize houses with many unique items
- **Consider "disliked" items**: the game penalizes items a Pokemon dislikes — we could model this as negative overlap

If you want to try a new algorithm:
1. Create a new file in `src/algorithm/` (e.g. `annealing.js`)
2. Export a function with the same signature as `clusterByPreferences(pokemonGroup, maxSize)`
3. Wire it in `optimizer.js` (or make it selectable)
4. Run `npm run stats` to compare (houses, average shared, compatibility, items to find)

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
- The stats script prints them: `npm run stats`

### Translations
- Locale files are in `public/i18n/`
- Each file has sections: `meta`, `nav`, `common`, `environments`, `preferences`, `pokemon`
- Pokemon names must use official localized names
- To add a new language: create the JSON file and add the locale code to `SUPPORTED_LOCALES` in `src/core/i18n.js`

### Data Corrections
- Pokemon data is in `public/data/pokemon.csv` (keys are French names without accents; forms get a suffix like `Viskuse Femelle`)
- `npm run sync -- --dry-run` compares the CSV with Serebii and reports differences; without `--dry-run` it applies them
- If you fix something by hand, cite your source (Serebii, in-game screenshot, etc.)

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
