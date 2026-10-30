import {
  ARENA_RADIUS, MAX_ENEMIES, SeededRandom, UPGRADES, applyUpgrade, awardXp,
  canHitInArc, damagePlayer, livingUpgrades, makePlayer, movePlayer, spawnPosition,
  type Enemy, type EnemyKind, type Gem, type InputState, type RandomSource, type RunPhase, type Upgrade,
  type UpgradeId, type Vec,
} from './model';
import { BLADE_BEAM, BOMB_BLAST, BUSTER_SWORD, ENEMY_ARCHETYPES, type AbilityDefinition, type CombatBehavior } from './content';

export interface Beam extends Vec { vx: number; vy: number; life: number; hit: Set<number> }
export interface CombatEffect { kind: 'slash' | 'blast' | 'hit'; x: number; y: number; angle: number; life: number; maxLife: number }
export interface GameConfig { survivalSeconds: number; seed: number }
const DEFAULT_CONFIG: GameConfig = { survivalSeconds: 180, seed: 0x43525953 };

export class GameSimulation {
  phase: RunPhase = 'title';
  player = makePlayer();
  enemies: Enemy[] = [];
  gems: Gem[] = [];
  beams: Beam[] = [];
  effects: CombatEffect[] = [];
  elapsed = 0;
  upgrades: Upgrade[] = [];
  readonly config: GameConfig;
  private random: RandomSource;
  private nextId = 0;
  private spawnTimer = 0.4;
  private moveInput: InputState = { x: 0, y: 0 };
  private readonly swordBehavior: CombatBehavior = {
    definition: BUSTER_SWORD,
    execute: (context) => context.attack(BUSTER_SWORD),
  };
  private viewport = { width: 1280, height: 720 };

  constructor(config: Partial<GameConfig> = {}, random?: RandomSource) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.random = random ?? new SeededRandom(this.config.seed);
  }

  start(): void {
    this.phase = 'playing'; this.player = makePlayer(); this.enemies = []; this.gems = [];
    this.beams = []; this.effects = []; this.elapsed = 0; this.upgrades = [];
    this.spawnTimer = 0.35; this.nextId = 0;
  }

  setMoveInput(input: InputState): void { this.moveInput = input; }
  setViewport(width: number, height: number): void { this.viewport = { width, height }; }
  togglePause(): void {
    if (this.phase === 'playing') this.phase = 'paused';
    else if (this.phase === 'paused') this.phase = 'playing';
  }

  selectUpgrade(index: number): boolean {
    if (this.phase !== 'levelup' || !this.upgrades[index]) return false;
    applyUpgrade(this.player, this.upgrades[index]!.id);
    this.upgrades = [];
    this.phase = 'playing';
    return true;
  }

  tick(dt: number): void {
    if (this.phase !== 'playing') return;
    const step = Math.min(dt, 0.05);
    this.elapsed += step;
    movePlayer(this.player, this.moveInput, step);
    this.player.invulnerable = Math.max(0, this.player.invulnerable - step);
    this.player.attackTimer -= step;
    this.effects = this.effects.map((e) => ({ ...e, life: e.life - step })).filter((e) => e.life > 0);

    if (this.player.attackTimer <= 0 && this.enemies.length) this.swordBehavior.execute({ attack: (ability) => this.attack(ability) });
    this.updateEnemies(step);
    this.updateBeams(step);
    this.collectGems(step);
    this.spawnTimer -= step;
    const spawnInterval = Math.max(0.32, 1.45 - this.elapsed / 210);
    if (this.spawnTimer <= 0 && this.enemies.length < MAX_ENEMIES) {
      this.spawnEnemy(); this.spawnTimer = spawnInterval * (0.78 + this.random.next() * 0.44);
    }
    if (this.player.hp <= 0) this.phase = 'defeat';
    if (this.elapsed >= this.config.survivalSeconds) this.phase = 'victory';
  }

  private spawnEnemy(): void {
    const minimum = Math.hypot(this.viewport.width / 2, this.viewport.height / 2) + 72;
    const p = spawnPosition(this.player, this.random, minimum, minimum + 180);
    const kind: EnemyKind = this.random.next() < Math.min(0.38, 0.14 + this.elapsed / 480) ? 'bomb' : 'goblin';
    const scale = 1 + this.elapsed / 150;
    const archetype = ENEMY_ARCHETYPES[kind];
    this.enemies.push({ ...p, id: this.nextId++, kind, hp: archetype.maxHp * scale,
      maxHp: archetype.maxHp * scale, speed: archetype.speed * (1 + this.elapsed / 360),
      damage: archetype.damage, radius: archetype.radius, contactTimer: 0, fuse: 0 });
  }

  private updateEnemies(dt: number): void {
    for (const enemy of this.enemies) {
      enemy.contactTimer = Math.max(0, enemy.contactTimer - dt);
      const dx = this.player.x - enemy.x, dy = this.player.y - enemy.y;
      const d = Math.hypot(dx, dy) || 1;
      if (enemy.kind === 'bomb' && enemy.fuse === 0 && d < 225) enemy.fuse = 2.1;
      if (enemy.kind === 'bomb' && enemy.fuse > 0) {
        enemy.fuse -= dt;
        if (enemy.fuse <= 0) {
          this.effects.push({ kind: 'blast', x: enemy.x, y: enemy.y, angle: 0, life: 0.45, maxLife: 0.45 });
          if (d < BOMB_BLAST.range) damagePlayer(this.player, enemy.damage + 4);
          enemy.hp = 0;
          continue;
        }
      }
      const speedFactor = enemy.kind === 'bomb' && enemy.fuse > 0 ? 0.34 : 1;
      if (d > enemy.radius + 21) { enemy.x += dx / d * enemy.speed * speedFactor * dt; enemy.y += dy / d * enemy.speed * speedFactor * dt; }
      else if (enemy.contactTimer <= 0) {
        damagePlayer(this.player, enemy.damage);
        enemy.contactTimer = enemy.kind === 'bomb' ? 1.8 : 1.05;
      }
    }
  }

  private attack(ability: AbilityDefinition): void {
    let target: Enemy | undefined, nearest = Infinity;
    for (const enemy of this.enemies) {
      const d = Math.hypot(enemy.x - this.player.x, enemy.y - this.player.y);
      if (d < nearest) { nearest = d; target = enemy; }
    }
    if (!target || nearest > 145) { this.player.attackTimer = 0.12; return; }
    const dx = target.x - this.player.x, dy = target.y - this.player.y;
    const len = Math.hypot(dx, dy) || 1;
    const direction = { x: dx / len, y: dy / len };
    this.player.attackFacing = direction;
    this.player.attackTimer = this.player.cooldown;
    this.effects.push({ kind: 'slash', x: this.player.x + direction.x * 27, y: this.player.y + direction.y * 27,
      angle: Math.atan2(direction.y, direction.x), life: 0.24, maxLife: 0.24 });
    for (const enemy of this.enemies) {
      if (!canHitInArc(this.player, direction, enemy, ability.range, Math.PI * 0.78)) continue;
      this.hitEnemy(enemy, this.player.damage * ability.damageScale);
    }
    if (this.player.bladeBeam) this.beams.push({ x: this.player.x + direction.x * 22, y: this.player.y + direction.y * 22,
      vx: direction.x * BLADE_BEAM.range, vy: direction.y * BLADE_BEAM.range, life: 1.5, hit: new Set() });
  }

  private hitEnemy(enemy: Enemy, damage: number): void {
    if (enemy.hp <= 0) return;
    enemy.hp -= damage;
    const dx = enemy.x - this.player.x, dy = enemy.y - this.player.y, d = Math.hypot(dx, dy) || 1;
    enemy.x += dx / d * 23; enemy.y += dy / d * 23;
    this.effects.push({ kind: 'hit', x: enemy.x, y: enemy.y, angle: 0, life: 0.18, maxLife: 0.18 });
    if (enemy.hp <= 0) {
      enemy.hp = 0; this.player.kills++;
      this.gems.push({ x: enemy.x, y: enemy.y, value: ENEMY_ARCHETYPES[enemy.kind].xpValue, id: this.nextId++ });
    }
  }

  private updateBeams(dt: number): void {
    for (const beam of this.beams) {
      beam.x += beam.vx * dt; beam.y += beam.vy * dt; beam.life -= dt;
      for (const enemy of this.enemies) if (!beam.hit.has(enemy.id) && Math.hypot(enemy.x - beam.x, enemy.y - beam.y) < enemy.radius + 17) {
        beam.hit.add(enemy.id); this.hitEnemy(enemy, this.player.damage * BLADE_BEAM.damageScale);
      }
    }
    this.beams = this.beams.filter((b) => b.life > 0);
  }

  private collectGems(dt: number): void {
    const remaining: Gem[] = [];
    for (const gem of this.gems) {
      const dx = this.player.x - gem.x, dy = this.player.y - gem.y, d = Math.hypot(dx, dy);
      if (d < this.player.pickupRadius) {
        const speed = 480;
        gem.x += dx / Math.max(d, 1) * Math.min(d, speed * dt);
        gem.y += dy / Math.max(d, 1) * Math.min(d, speed * dt);
      }
      if (d < 24) {
        const levelUp = awardXp(this.player, gem.value);
        if (levelUp) {
          this.phase = 'levelup';
          const available = livingUpgrades(this.player);
          const shuffled = [...available].sort(() => this.random.next() - 0.5);
          this.upgrades = shuffled.slice(0, 3);
        }
      } else remaining.push(gem);
    }
    this.gems = remaining;
  }
}

export function upgradeById(id: UpgradeId) { return UPGRADES.find((item) => item.id === id)!; }
export const arenaRadius = ARENA_RADIUS;
