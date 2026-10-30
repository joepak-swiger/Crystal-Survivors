import { describe, expect, it } from 'vitest';
import {
  applyUpgrade, awardXp, canHitInArc, damagePlayer, livingUpgrades, makePlayer, movePlayer, spawnPosition,
} from '../src/game/model';
import { GameSimulation } from '../src/game/simulation';

describe('movement and damage', () => {
  it('moves at a normalized diagonal speed and remembers facing', () => {
    const player = makePlayer();
    movePlayer(player, { x: 1, y: 1 }, 1);
    expect(Math.hypot(player.x, player.y)).toBeCloseTo(player.speed);
    expect(player.facing.x).toBeCloseTo(Math.SQRT1_2);
  });

  it('clamps movement to arena bounds', () => {
    const player = makePlayer();
    movePlayer(player, { x: 1, y: 0 }, 100);
    expect(Math.hypot(player.x, player.y)).toBeLessThanOrEqual(1700);
  });

  it('applies health damage once during the invulnerability window', () => {
    const player = makePlayer();
    expect(damagePlayer(player, 23)).toBe(true);
    expect(player.hp).toBe(77);
    expect(damagePlayer(player, 23)).toBe(false);
    expect(player.hp).toBe(77);
    player.invulnerable = 0;
    expect(damagePlayer(player, 1000)).toBe(true);
    expect(player.hp).toBe(0);
  });
});

describe('combat and progression', () => {
  it('uses a directional melee arc rather than overlap alone', () => {
    expect(canHitInArc({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 50, y: 0 })).toBe(true);
    expect(canHitInArc({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: -20, y: 0 })).toBe(false);
    expect(canHitInArc({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 140, y: 0 })).toBe(false);
  });

  it('starts the attack cooldown after a valid swing and can kill an enemy', () => {
    const game = new GameSimulation({ seed: 2 }); game.start();
    const p = game.player;
    p.attackTimer = 0;
    game.enemies.push({ id: 500, x: p.x + 55, y: p.y, kind: 'goblin', hp: 24, maxHp: 24, speed: 0, damage: 10, radius: 16, contactTimer: 0, fuse: 0 });
    game.tick(0.05);
    expect(game.player.attackTimer).toBeGreaterThan(0.5);
    expect(game.player.kills).toBe(1);
    expect(game.enemies[0]!.hp).toBe(0);
    expect(game.gems).toHaveLength(1);
  });

  it('collects XP, crosses level thresholds, and applies upgrade effects', () => {
    const player = makePlayer();
    expect(awardXp(player, 5)).toBe(false);
    expect(awardXp(player, 1)).toBe(true);
    expect(player.level).toBe(2);
    const old = player.damage;
    applyUpgrade(player, 'damage');
    expect(player.damage).toBeCloseTo(old * 1.35);
  });

  it('applies each remaining upgrade and unlocks the Beam only once', () => {
    const player = makePlayer();
    const cooldown = player.cooldown, speed = player.speed, radius = player.pickupRadius;
    player.hp = 60;
    applyUpgrade(player, 'haste');
    applyUpgrade(player, 'vitality');
    applyUpgrade(player, 'swift');
    applyUpgrade(player, 'magnet');
    applyUpgrade(player, 'blade-beam');
    expect(player.cooldown).toBeCloseTo(cooldown * 0.82);
    expect(player.maxHp).toBe(130);
    expect(player.hp).toBe(90);
    expect(player.speed).toBeCloseTo(speed * 1.12);
    expect(player.pickupRadius).toBe(radius + 45);
    expect(player.bladeBeam).toBe(true);
    expect(livingUpgrades(player).map((upgrade) => upgrade.id)).not.toContain('blade-beam');
  });

  it('launches the unlocked Blade Beam and deals projectile damage', () => {
    const game = new GameSimulation({ seed: 4 }); game.start();
    applyUpgrade(game.player, 'blade-beam'); game.player.attackTimer = 0;
    game.enemies.push({ id: 880, x: 130, y: 0, kind: 'goblin', hp: 200, maxHp: 200,
      speed: 0, damage: 0, radius: 16, contactTimer: 0, fuse: 0 });
    for (let i = 0; i < 5; i++) game.tick(0.05);
    expect(game.player.attackFacing.x).toBeCloseTo(1);
    expect(game.enemies[0]!.hp).toBeLessThan(200);
  });

  it('explodes a fused Bomb and applies area damage', () => {
    const game = new GameSimulation({ seed: 4 }); game.start(); game.player.attackTimer = 100;
    game.enemies.push({ id: 881, x: 90, y: 0, kind: 'bomb', hp: 10_000, maxHp: 10_000,
      speed: 0, damage: 24, radius: 20, contactTimer: 100, fuse: 0 });
    for (let i = 0; i < 45; i++) game.tick(0.05);
    expect(game.player.hp).toBeLessThan(100);
    expect(game.effects.some((effect) => effect.kind === 'blast')).toBe(true);
  });

  it('opens an upgrade choice after XP gem pickup and resumes after selection', () => {
    const game = new GameSimulation({ seed: 9 }); game.start();
    game.player.xp = game.player.xpNext - 1;
    game.gems.push({ x: 0, y: 0, value: 1, id: 777 });
    game.tick(0.016);
    expect(game.phase).toBe('levelup');
    expect(game.upgrades).toHaveLength(3);
    expect(game.selectUpgrade(0)).toBe(true);
    expect(game.phase).toBe('playing');
  });

  it('spawns outside the immediate player vicinity and offers Blade Beam once', () => {
    const game = new GameSimulation({ seed: 1 }); game.start();
    const pos = spawnPosition(game.player, { next: () => 0.5 });
    expect(Math.hypot(pos.x - game.player.x, pos.y - game.player.y)).toBeGreaterThanOrEqual(520);
    applyUpgrade(game.player, 'blade-beam');
    expect(game.player.bladeBeam).toBe(true);
  });

  it('keeps director spawns beyond the current camera rectangle', () => {
    const game = new GameSimulation({ seed: 1 }); game.start(); game.setViewport(1280, 720);
    for (let i = 0; i < 9; i++) game.tick(0.05);
    expect(game.enemies.length).toBeGreaterThan(0);
    const visibleCorner = Math.hypot(1280 / 2, 720 / 2);
    expect(Math.hypot(game.enemies[0]!.x, game.enemies[0]!.y)).toBeGreaterThan(visibleCorner);
  });
});

describe('run state', () => {
  it('pauses and resumes without advancing survival time', () => {
    const game = new GameSimulation({ seed: 4 }); game.start();
    game.togglePause(); game.tick(2);
    expect(game.phase).toBe('paused'); expect(game.elapsed).toBe(0);
    game.togglePause(); game.tick(0.05);
    expect(game.phase).toBe('playing'); expect(game.elapsed).toBeCloseTo(0.05);
  });

  it('reaches victory, defeat, and resets on restart', () => {
    const winner = new GameSimulation({ survivalSeconds: 0.04, seed: 1 }); winner.start(); winner.tick(0.05);
    expect(winner.phase).toBe('victory');
    const loser = new GameSimulation({ seed: 1 }); loser.start(); loser.player.hp = 1; loser.player.invulnerable = 0;
    loser.enemies.push({ id: 2, x: 8, y: 0, kind: 'goblin', hp: 200, maxHp: 200, speed: 0, damage: 10, radius: 16, contactTimer: 0, fuse: 0 });
    loser.tick(0.05);
    expect(loser.phase).toBe('defeat');
    loser.start(); expect(loser.phase).toBe('playing'); expect(loser.player.hp).toBe(100); expect(loser.elapsed).toBe(0);
  });
});
