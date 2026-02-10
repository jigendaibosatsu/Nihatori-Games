/**
 * PuniPuni character - blob with HP, ATK, DEF, Condition, Energy
 */

import { CONFIG } from './config';

export type StateId = (typeof CONFIG.STATES)[keyof typeof CONFIG.STATES];

export interface PuniPuni {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  condition: number;
  energy: number;
  state: StateId;
  stateTimer: number;
  invulnerable: number;
  // Cooldowns (in ms remaining)
  cooldownStone: number;
  cooldownHyper: number;
  cooldownMultiply: number;
  cooldownSpin: number;
  cooldownGiant: number;
  // Attack phase
  attackPhase: 'idle' | 'startup' | 'active' | 'recovery';
  attackHitDealt: boolean;
  attackTargetX: number;
  attackTargetY: number;
  // Stone
  stoneDefBoost: number;
  stoneSpeedMult: number;
  // Hyper
  hyperDirX: number;
  hyperDirY: number;
  hyperDamageDealt: boolean;
  // Spin
  spinAngle: number;
  spinLastDamageTime: number;
  // Giant
  giantScale: number;
  giantSlamY: number;
  giantDamageDealt: boolean;
  // Clones
  clones: Clone[];
}

export interface Clone {
  x: number;
  y: number;
  radius: number;
  lifetime: number;
  maxLifetime: number;
  lastAttackTime: number;
}

export function createPuniPuni(): PuniPuni {
  return {
    x: CONFIG.ARENA_WIDTH / 2,
    y: CONFIG.ARENA_HEIGHT / 2,
    vx: 0,
    vy: 0,
    radius: CONFIG.CHARACTER_RADIUS,
    hp: CONFIG.CHARACTER_HP,
    maxHp: CONFIG.CHARACTER_HP,
    atk: CONFIG.CHARACTER_ATK,
    def: CONFIG.CHARACTER_DEF,
    condition: CONFIG.CHARACTER_CONDITION,
    energy: 0,
    state: CONFIG.STATES.IDLE,
    stateTimer: 0,
    invulnerable: 0,
    cooldownStone: 0,
    cooldownHyper: 0,
    cooldownMultiply: 0,
    cooldownSpin: 0,
    cooldownGiant: 0,
  attackPhase: 'idle',
  attackHitDealt: false,
  attackTargetX: 0,
  attackTargetY: 0,
    stoneDefBoost: 1,
    stoneSpeedMult: 1,
  hyperDirX: 0,
  hyperDirY: 0,
  hyperDamageDealt: false,
    spinAngle: 0,
  spinLastDamageTime: 0,
  giantScale: 1,
  giantSlamY: 0,
  giantDamageDealt: false,
    clones: [],
  };
}

/** Compute damage: max(1, (ATK * mult * cond) - (DEF * 0.7)) * rand(0.9..1.1) */
export function computeDamage(
  atk: number,
  def: number,
  condition: number,
  skillMultiplier: number
): number {
  const raw = atk * skillMultiplier * condition - def * CONFIG.DAMAGE_DEF_MULT;
  const base = Math.max(1, raw);
  const rand =
    CONFIG.DAMAGE_RAND_MIN +
    Math.random() * (CONFIG.DAMAGE_RAND_MAX - CONFIG.DAMAGE_RAND_MIN);
  return Math.max(1, Math.floor(base * rand));
}

export function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.hypot(x2 - x1, y2 - y1);
}

export function isPointInCircle(
  px: number,
  py: number,
  cx: number,
  cy: number,
  r: number
): boolean {
  return distance(px, py, cx, cy) <= r;
}
