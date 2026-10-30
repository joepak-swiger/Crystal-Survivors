import type { EnemyKind, UpgradeId } from './model';

export interface AnimationSheetDefinition {
  rows: 8;
  framesPerDirection: number;
  frameWidth: number;
  frameHeight: number;
  directionNames: readonly ['S', 'SW', 'W', 'NW', 'N', 'NE', 'E', 'SE'];
}

export interface HeroDefinition {
  id: string;
  name: string;
  primaryWeapon: string;
  maxHp: number;
  speed: number;
  damage: number;
  attackCooldown: number;
  pickupRadius: number;
  animation: AnimationSheetDefinition;
}

export const CLOUD: HeroDefinition = {
  id: 'cloud', name: 'Cloud Strife', primaryWeapon: 'Buster Sword',
  maxHp: 100, speed: 245, damage: 28, attackCooldown: 0.58, pickupRadius: 78,
  animation: { rows: 8, framesPerDirection: 4, frameWidth: 64, frameHeight: 96,
    directionNames: ['S', 'SW', 'W', 'NW', 'N', 'NE', 'E', 'SE'] },
};

export interface EnemyArchetypeDefinition {
  kind: EnemyKind;
  maxHp: number;
  speed: number;
  damage: number;
  radius: number;
  xpValue: number;
}

export const ENEMY_ARCHETYPES: Record<EnemyKind, EnemyArchetypeDefinition> = {
  goblin: { kind: 'goblin', maxHp: 58, speed: 82, damage: 10, radius: 16, xpValue: 1 },
  bomb: { kind: 'bomb', maxHp: 82, speed: 61, damage: 24, radius: 20, xpValue: 2 },
};

export interface AbilityDefinition {
  id: string;
  name: string;
  behavior: 'melee-arc' | 'piercing-projectile' | 'area-burst';
  damageScale: number;
  range: number;
  unlock?: UpgradeId;
}

export interface CombatContext {
  attack(definition: AbilityDefinition): void;
}

export interface CombatBehavior {
  readonly definition: AbilityDefinition;
  execute(context: CombatContext): void;
}

export const BUSTER_SWORD: AbilityDefinition = {
  id: 'buster-sword', name: 'Buster Sword', behavior: 'melee-arc', damageScale: 1, range: 112,
};
export const BLADE_BEAM: AbilityDefinition = {
  id: 'blade-beam', name: 'Blade Beam', behavior: 'piercing-projectile', damageScale: 0.72, range: 510,
  unlock: 'blade-beam',
};
export const BOMB_BLAST: AbilityDefinition = {
  id: 'bomb-blast', name: 'Bomb blast', behavior: 'area-burst', damageScale: 1, range: 152,
};
