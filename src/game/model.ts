
import { CLOUD } from './content';

export type RunPhase = 'title' | 'playing' | 'levelup' | 'paused' | 'victory' | 'defeat';
export type UpgradeId = 'damage' | 'haste' | 'vitality' | 'swift' | 'magnet' | 'blade-beam';
export type EnemyKind = 'goblin' | 'bomb';

export interface Vec { x: number; y: number }
export interface Player extends Vec {
  hp: number; maxHp: number; speed: number; damage: number; cooldown: number;
  attackTimer: number; invulnerable: number; pickupRadius: number; xp: number;
  level: number; xpNext: number; kills: number; facing: Vec; bladeBeam: boolean;
  attackFacing: Vec;
}
export interface Enemy extends Vec {
  id: number; kind: EnemyKind; hp: number; maxHp: number; speed: number;
  damage: number; radius: number; contactTimer: number; fuse: number;
}
export interface Gem extends Vec { value: number; id: number }
export interface Upgrade { id: UpgradeId; title: string; detail: string }
export interface InputState { x: number; y: number }
export interface RandomSource { next(): number }

export const ARENA_RADIUS = 1700;
export const MAX_ENEMIES = 70;
export const UPGRADES: Upgrade[] = [
  { id: 'damage', title: 'Sharpen the Edge', detail: '+35% Buster Sword damage' },
  { id: 'haste', title: 'Swift Strikes', detail: 'Attack 18% faster' },
  { id: 'vitality', title: 'Phoenix Down', detail: '+30 max HP and restore 30 HP' },
  { id: 'swift', title: 'Windwalk', detail: '+12% movement speed' },
  { id: 'magnet', title: 'Materia Magnet', detail: '+45 pickup radius' },
  { id: 'blade-beam', title: 'Blade Beam', detail: 'Sword strikes launch a piercing crystal wave' },
];

export class SeededRandom implements RandomSource {
  constructor(private state = 0x43525953) {}
  next(): number {
    this.state = (this.state * 1664525 + 1013904223) >>> 0;
    return this.state / 0x100000000;
  }
}

export function makePlayer(hero = CLOUD): Player {
  return { x: 0, y: 0, hp: hero.maxHp, maxHp: hero.maxHp, speed: hero.speed, damage: hero.damage, cooldown: hero.attackCooldown,
    attackTimer: 0.25, invulnerable: 0, pickupRadius: hero.pickupRadius, xp: 0, level: 1, xpNext: 6,
    kills: 0, facing: { x: 1, y: 0 }, attackFacing: { x: 1, y: 0 }, bladeBeam: false };
}

export function movePlayer(player: Player, input: InputState, dt: number): void {
  let { x, y } = input;
  const length = Math.hypot(x, y);
  if (length > 1) { x /= length; y /= length; }
  player.x += x * player.speed * dt;
  player.y += y * player.speed * dt;
  const radius = Math.hypot(player.x, player.y);
  if (radius > ARENA_RADIUS) { player.x *= ARENA_RADIUS / radius; player.y *= ARENA_RADIUS / radius; }
  if (Math.abs(x) + Math.abs(y) > 0) player.facing = { x, y };
}

export function damagePlayer(player: Player, amount: number): boolean {
  if (player.hp <= 0 || player.invulnerable > 0) return false;
  player.hp = Math.max(0, player.hp - amount);
  player.invulnerable = 0.75;
  return true;
}

export function spawnPosition(player: Vec, random: RandomSource, minimum = 520, maximum = 760): Vec {
  const angle = random.next() * Math.PI * 2;
  const distance = minimum + random.next() * (maximum - minimum);
  const x = player.x + Math.cos(angle) * distance;
  const y = player.y + Math.sin(angle) * distance;
  const radius = Math.hypot(x, y);
  if (radius > ARENA_RADIUS - 35) return { x: x * (ARENA_RADIUS - 35) / radius, y: y * (ARENA_RADIUS - 35) / radius };
  return { x, y };
}

export function canHitInArc(origin: Vec, facing: Vec, target: Vec, range = 112, arc = Math.PI * 0.76): boolean {
  const dx = target.x - origin.x, dy = target.y - origin.y;
  const dist = Math.hypot(dx, dy);
  if (dist > range || dist === 0) return false;
  const angle = Math.acos(Math.max(-1, Math.min(1, (dx * facing.x + dy * facing.y) / dist)));
  return angle <= arc / 2;
}

export function awardXp(player: Player, amount: number): boolean {
  player.xp += amount;
  if (player.xp < player.xpNext) return false;
  player.xp -= player.xpNext;
  player.level++;
  player.xpNext = Math.ceil(player.xpNext * 1.45 + 2);
  return true;
}

export function applyUpgrade(player: Player, upgrade: UpgradeId): void {
  switch (upgrade) {
    case 'damage': player.damage *= 1.35; break;
    case 'haste': player.cooldown = Math.max(0.2, player.cooldown * 0.82); break;
    case 'vitality': player.maxHp += 30; player.hp = Math.min(player.maxHp, player.hp + 30); break;
    case 'swift': player.speed *= 1.12; break;
    case 'magnet': player.pickupRadius += 45; break;
    case 'blade-beam': player.bladeBeam = true; break;
  }
}

export function livingUpgrades(player: Player): Upgrade[] {
  return UPGRADES.filter((u) => u.id !== 'blade-beam' || !player.bladeBeam);
}


