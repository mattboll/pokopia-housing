# Pokopia Housing

**https://mattboll.github.io/pokopia-housing/**

Optimize Pokemon housing in **Pokemon Pokopia** by grouping Pokemon with shared preferences to minimize the number of houses and the number of items to craft.

**360 Pokemon (base game, Bubbly Basin DLC, event Pokemon) grouped into 92 houses** instead of 360 individual habitats.

## Features

- **Optimal Housing**: grouping of every Pokemon in the game, computed in your browser
  - toggle the **Bubbly Basin DLC** and **event Pokemon** on/off
  - **minimum shared preferences** slider: trade a few more houses for houses where every item pleases all residents
- **Custom Planner / my village**: select the Pokemon you own and get personalized houses
  - **edit the result**: drag & drop residents between houses, move menu, create a house
  - **lock** houses you have already built, then re-optimize the rest
  - saved in your browser, **share link**, JSON export / import
- **Filters**: environment, region, specialty, DLC / event, can dive
- **Installable (PWA)** and works offline once loaded
- **5 Languages**: Japanese, English, French, German, Spanish (auto-detected)
- **Accessible**: WCAG 2.1 AA, keyboard navigation, screen reader support
- **Dark/Light Mode**, responsive, no account, no data collected

## How It Works

In Pokopia, each Pokemon has:
- An **ideal habitat**: Bright, Dark, Warm, Cool, Humid, or Dry
- **6 favorites**: 5 item categories (wooden stuff, round stuff, electronics, ...) and 1 flavor

Houses can hold up to 4 Pokemon, but they must all share the **same environment**. Items placed in a house benefit **all residents**, so grouping Pokemon with overlapping preferences means fewer items to craft, and items from a category liked by everyone raise everybody's comfy level at once.

### The Algorithm

1. **Partition** Pokemon by environment (hard constraint)
2. **Greedy clustering** of each group: seed a house with the hardest-to-place Pokemon, then add the candidate that brings the fewest new preferences (4 per house max)
3. **Local search**: swap or move Pokemon between houses while it lowers the number of items that do not please everyone
4. Optional **minimum shared preferences**: a candidate only joins a house if at least N preferences stay liked by all residents (N = 0 gives the fewest houses, N = 6 gives one Pokemon per house)

Results for the full dataset (`npm run stats`):

| min shared | houses | avg shared prefs | avg compatibility |
|-----------:|-------:|-----------------:|------------------:|
| 0 | 92 | 2.16 | 21% |
| 2 | 101 | 2.63 | 27% |
| 3 | 140 | 3.97 | 51% |
| 4 | 207 | 5.11 | 76% |

Compatibility = share of the distinct items needed by a house that please every resident.

There is still room for improvement (simulated annealing, ILP, ...). See [CONTRIBUTING.md](CONTRIBUTING.md).

## Development

```bash
npm install
npm run dev         # Start dev server
npm run build       # Build for production (+ service worker)
npm run preview     # Preview production build
npm run stats       # Print optimization statistics for the dataset
npm run sync        # Sync data from Serebii (see below)
```

### Updating the data

`npm run sync -- --dry-run` fetches every Pokemon page of Serebii's Pokopia Pokedex (cached in `.cache/`), compares habitat, favorites, specialties and dive ability with `public/data/pokemon.csv`, and reports differences. Without `--dry-run` it rewrites the CSV and metadata, and adds new Pokemon with names from PokeAPI in the 5 locale files. New alternate forms are reported and must be given a CSV key by hand.

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
  sync-serebii.js        # data sync (npm run sync)
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
