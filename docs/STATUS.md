# Milestone 1 status

Playable foundation: Cloud moves around a bounded scrolling grass arena; his Buster Sword targets the closest nearby enemy and applies a real directional melee arc. Goblins pursue and attack on contact. Bombs telegraph before area damage. Kills drop collectible XP, level-ups pause the run for a three-card choice, and upgrades modify combat, health, movement, pickup range, or unlock Blade Beam. Runs end in victory after 180 seconds or defeat at zero HP, and can restart.

## Verification

The automated suite covers normalized movement and arena bounds, damage/invulnerability, melee hit arcs and enemy death, XP and level thresholds, upgrades, spawn distance, pause, victory/defeat, and restart. Run `npm run typecheck`, `npm test`, `npm run build`, then `npm run test:e2e` for the browser check. Playwright produces actual rendered screenshots in `artifacts/`: combat, upgrade selection, game over, and victory.

## Current limitations

The supplied placeholder atlas has four frames per row and eight rows, but the artwork repeats a similar side-facing pose across directions; it does not supply eight distinct directional walk cycles. Goblins and Bombs are original geometric placeholders. Gamepad start input currently reads the south button while held. The timer is three minutes for development; `GameSimulation` accepts `survivalSeconds` for other run lengths. No sound or boss is included in this first slice.
