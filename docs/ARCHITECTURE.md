# Architecture

## Runtime flow

`src/main.ts` owns the PixiJS application, resize-aware camera, draw passes, keyboard/gamepad input, HUD and overlays. Camera coordinates are centered on Cloud; arena and entity positions remain in simulation/world space. Graphics are rebuilt as lightweight Pixi `Graphics` layers each rendered frame, while Cloud's atlas textures are loaded and sliced once.

`src/game/model.ts` contains typed data, player movement, damage, spawn placement, melee arc tests, XP progression and upgrade effects. `src/game/simulation.ts` owns the run phase and fixed-step-like bounded update (variable render delta capped at 50 ms), enemy director, combat behavior, projectile, pickups and run transitions. Rendering does not decide whether an attack hits.

## Extending content

`UpgradeId`, `Upgrade`, `EnemyKind`, and `Player` define the initial content model. `content.ts` contains typed Cloud, enemy archetype, animation sheet and ability definitions. Combat behaviors implement a small shared `CombatBehavior` interface; the Buster Sword currently dispatches the melee arc, Blade Beam adds piercing projectiles when unlocked, and Bomb uses its area-burst definition. Future hero definitions can supply base stats and animation configuration instead of hard-coding character details in renderer logic.

## Stability

Simulation uses seconds and caps each update to 0.05 seconds, so a delayed browser frame cannot make a character jump a large distance. Movement input is normalized; the camera follows the player directly. A seeded linear congruential random source keeps spawn and upgrade sequences repeatable. The enemy director spawns outside the viewport rectangle, and the bounded arena and 70-enemy cap keep the first slice manageable without a spatial index.
