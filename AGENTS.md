# Project guidance

- Keep simulation rules in `src/game/` and rendering/input/UI in `src/main.ts` and `src/style.css`.
- Keep gameplay content typed and data driven. Do not add network services or external asset dependencies.
- Use seconds for simulation time and normalize movement input.
- Run `npm run typecheck`, `npm test`, and `npm run build` after game logic changes. Run `npm run test:e2e` when Playwright is available.
- Keep pixel art nearest-neighbor scaled and document supplied fan-art provenance in `docs/ASSET_GUIDE.md`.
