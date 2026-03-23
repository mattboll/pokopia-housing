# Pokopia Housing

**https://mattboll.github.io/pokopia-housing/**

Optimize Pokemon housing in **Pokemon Pokopia** by grouping Pokemon with shared preferences to minimize the number of houses needed.

**297 Pokemon grouped into just 77 houses** (instead of 297 individual habitats).

## Features

- **Optimal Housing**: pre-computed optimal grouping for all Pokemon in the game
- **Custom Planner**: select your Pokemon and get personalized housing recommendations
- **5 Languages**: Japanese, English, French, German, Spanish (auto-detected)
- **Accessible**: WCAG 2.1 AA, keyboard navigation, screen reader support
- **Dark/Light Mode**: respects system preference with manual toggle
- **Responsive**: works on desktop, tablet, and mobile
- **No account needed**: everything runs in your browser, no data collected

## How It Works

In Pokopia, each Pokemon has:
- An **environment preference**: Bright, Dark, Hot, Cool, Humid, or Dry
- **4-6 object preferences**: wooden things, round things, electric things, etc.

Houses can hold up to 4 Pokemon, but they must all share the **same environment**. Items placed in a house benefit **all residents** — so grouping Pokemon with overlapping preferences means fewer items to craft.

### The Algorithm

1. **Partition** Pokemon by environment (hard constraint)
2. **Cluster** each group by maximizing shared preferences (greedy agglomerative)
3. Respect the **4-per-house limit**

Current result: **79 houses, average score 2.19 shared preferences per house**.

The algorithm is intentionally simple (greedy) — there's room for improvement! See [CONTRIBUTING.md](CONTRIBUTING.md) for ideas like simulated annealing, genetic algorithms, or ILP.

## Development

```bash
npm install
npm run dev         # Start dev server
npm run build       # Precompute optimal + build for production
npm run precompute  # Only regenerate optimal-result.json
npm run preview     # Preview production build
```

## Project Structure

```
src/
  algorithm/        # Optimization logic (partition, scoring, clustering)
  core/             # App infrastructure (i18n, router, store, theme)
  components/       # UI components (cards, selectors, filters)
  pages/            # Page renderers (optimal, planner, legal)
  styles/           # CSS design system (tokens, themes, components)
  utils/            # Helpers (DOM, CSV parser, a11y, debounce)
public/
  data/             # Pokemon CSV + precomputed results
  i18n/             # Locale files (ja, en, fr, de, es)
scripts/
  precompute-optimal.js  # Build-time optimization script
```

## Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for:
- How the algorithm works and how to improve it
- Adding translations or fixing data
- Code style and PR process

## Tech Stack

- Vanilla JS + Vite (no framework)
- Static site on GitHub Pages
- i18n with JSON locale files
- Zero runtime dependencies

## License

MIT - See [LICENSE](LICENSE)

## Disclaimer

This is a fan-made community tool. It is not affiliated with, endorsed, or approved by Nintendo, The Pokemon Company, or Game Freak. Pokemon and all associated names are trademarks of their respective owners.

## Data Sources

Pokemon preference data sourced from community resources: [Pokebip](https://www.pokebip.com), [Bulbapedia](https://bulbapedia.bulbagarden.net), [Serebii](https://www.serebii.net).
