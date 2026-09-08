# Pokopia Housing

**https://mattboll.github.io/pokopia-housing/**

Optimize Pokemon housing in **Pokemon Pokopia** by grouping Pokemon with shared preferences to minimize the number of houses and the number of items to craft.

**360 Pokemon (base game, Bubbly Basin DLC, event Pokemon) grouped into 92 houses** instead of 360 individual habitats.

## Features

- **Mobile first**: houses are tiles (environment band, residents' sprites, stars, items to place); tap one for its detail in a bottom sheet (side panel on desktop)
- **Optimal Housing**: grouping of every Pokemon in the game, computed in your browser
  - toggle the **Bubbly Basin DLC** and **event Pokemon** on/off
  - **favorites to satisfy per Pokemon** slider (default 4 of 6): the site computes the smallest set of items that gives every resident that many favorites
- **Custom Planner / my village**: select the Pokemon you own and get personalized houses
  - **shopping list per house**: the exact item categories to place, and how many favorites each resident gets
  - **suggested items**: 2 to 4 real items (from a catalog of 715 items with their favorite categories) that satisfy every resident; click a category to see every item that carries it
  - **edit the result**: drag & drop residents between houses, move menu, create a house
  - **lock** houses you have already built, then re-optimize the rest
  - **owned items**: uncheck what you do not have yet, suggestions adapt
  - saved in your browser, **share link**, JSON export / import
- **Filters**: environment, region, specialty, DLC / event, can dive; find which house a Pokemon lives in
- **Help page** and a first-visit banner explaining the game rules and what the tool optimizes
- **Installable (PWA)** and works offline once loaded
- **5 Languages**: Japanese, English, French, German, Spanish (auto-detected)
- **Accessible**: WCAG 2.1 AA, keyboard navigation, screen reader support
- **Dark/Light Mode**, responsive, no account, no data collected

## How It Works

In Pokopia, each Pokemon has:
- An **ideal habitat**: Bright, Dark, Warm, Cool, Humid, or Dry
- **6 favorites**: 5 item categories (wooden stuff, round stuff, electronics, ...) and 1 flavor

Houses can hold up to 4 Pokemon, but they must all share the **same environment**. Items placed in a house benefit **all residents**, and a resident does not need all six of its favorites to be happy. So the cost of a house is the **smallest number of item categories that gives every resident k of its favorites** (k = "favorites to satisfy", 4 by default). One item liked by several residents counts for all of them.

### The Algorithm

1. **Partition** Pokemon by environment (hard constraint)
2. **Exact house cost**: a small dynamic program (`src/algorithm/cover.js`) computes the minimum item cover of a house and the shopping list that achieves it
3. **Greedy clustering** of each group: seed a house with the hardest-to-place Pokemon, then add the candidate that adds the fewest items (4 per house max)
4. **Local search**: swap or move Pokemon between houses while it lowers the total number of items

Results for the full dataset (`npm run stats`), 92 houses in every case:

| favorites to satisfy | items to place | items per house | busiest house |
|---------------------:|---------------:|----------------:|--------------:|
| 3 | 354 | 3.8 | 6 |
| 4 | 535 | 5.8 | 8 |
| 5 | 770 | 8.4 | 12 |
| 6 (everything) | 1074 | 11.7 | 17 |

The number of favorites needed for the top comfy level is not documented; 4 is a guess, adjust the slider to your experience.

There is still room for improvement (simulated annealing, ILP, ...). See [CONTRIBUTING.md](CONTRIBUTING.md).

## Development

```bash
npm install
npm run dev         # Start dev server
npm run build       # Build for production (+ service worker)
npm run preview     # Preview production build
npm run stats       # Print optimization statistics for the dataset
npm run sync        # Sync Pokemon data from Serebii (see below)
npm run sync-items  # Rebuild the item catalog from Serebii's favorites pages
npm run sync-item-names-fr  # French item names from pokekalos.fr
```

### Updating the data

`npm run sync -- --dry-run` fetches every Pokemon page of Serebii's Pokopia Pokedex (cached in `.cache/`), compares habitat, favorites, specialties and dive ability with `public/data/pokemon.csv`, and reports differences. Without `--dry-run` it rewrites the CSV and metadata, and adds new Pokemon with names from PokeAPI in the 5 locale files. New alternate forms are reported and must be given a CSV key by hand.

`npm run sync-items` rebuilds `public/data/items.json` (item name, type, favorite categories) from Serebii's 43 favorite-category pages, then merges `public/data/items-overrides.json`. Serebii's catalog is still a work in progress: use the overrides file to add missing items, fix categories, or hide wrong entries. `npm run sync-item-names-fr` fills the French item names in `fr.json` from pokekalos.fr (706 of 715 matched). Other languages fall back to the English name; translations go under `items` in the locale files (keyed by item slug).

## Project Structure

```
src/
  algorithm/        # partition, greedy clustering, local search, scoring
  core/             # i18n, router, store, theme, plan (my village), pwa
  components/       # cards, selector, filters, options panel, popover
  pages/            # optimal, planner, legal
  styles/           # CSS design system (tokens, themes, components)
  utils/            # DOM, CSV parser, a11y, debounce
public/
  data/             # pokemon.csv, pokemon-meta.json, pokemon-ids.json
  i18n/             # locale files (ja, en, fr, de, es)
  icons/, manifest.webmanifest
scripts/
  precompute-optimal.js  # statistics (npm run stats)
  sync-serebii.js        # Pokemon data sync (npm run sync)
  sync-items.js          # item catalog sync (npm run sync-items)
  sync-item-names-fr.js  # French item names (npm run sync-item-names-fr)
  build-sw.js            # generates dist/sw.js after vite build
```

## Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md).

## Tech Stack

- Vanilla JS + Vite (no framework)
- Static site on GitHub Pages, installable PWA
- i18n with JSON locale files
- Zero runtime dependencies

## License

MIT - See [LICENSE](LICENSE)

## Disclaimer

This is a fan-made community tool. It is not affiliated with, endorsed, or approved by Nintendo, The Pokemon Company, or Game Freak. Pokemon and all associated names are trademarks of their respective owners.

## Data Sources

Pokemon preference data comes from [Serebii](https://www.serebii.net/pokemonpokopia/) (per-Pokemon pages), localized names from [PokeAPI](https://pokeapi.co), sprites from the PokeAPI sprites repository.
