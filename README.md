# Crystal Survivors

A local first, pixel fantasy survival game prototype built with TypeScript, Vite and PixiJS. Cloud fights automatically with the Buster Sword while the player dodges goblins and bombs, gathers materia, and chooses upgrades. A run lasts three minutes by default.

## Play locally

Requires Node.js 20 or newer and npm.

```sh
npm install
npm run dev
```

Open the local URL Vite prints (normally `http://localhost:5173`). The production build and local preview are:

```sh
npm run build
npm run preview
```

Quality checks:

```sh
npm run typecheck
npm test
npm run test:e2e
```

Playwright's first run may need its browser installed with `npx playwright install chromium`.

## How to play

- Move with WASD or arrow keys. Movement is normalized, so diagonal travel is not faster.
- Cloud swings automatically at the closest nearby enemy. Face the enemy with your movement for the clearest sword arc.
- Goblins chase and deal contact damage. Bombs slow down, telegraph, then burst in an area.
- Collect the blue XP crystals. On level up, choose one of three cards with the mouse or keys 1–3.
- Escape or P pauses. Survive to 03:00 to win. Enter or Space starts and restarts.
- A standard Gamepad API left stick or D-pad can move Cloud; south button starts a run.

## Project notes

- [Controls](docs/CONTROLS.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Current status and known limits](docs/STATUS.md)
- [Asset provenance](docs/ASSET_GUIDE.md)

The source artwork is experimental fan art supplied by the project owner. It is not licensed or cleared for commercial distribution. This project is an independent implementation and does not reuse PokéSurvivor source code.
