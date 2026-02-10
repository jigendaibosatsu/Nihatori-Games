/**
 * Simple chase-and-attack enemies with contact damage
 */

import { CONFIG } from './config';
import { distance } from './character';

export interface Enemy {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  speed: number;
  damageCooldown: number;
}

let nextId = 1;

export function createEnemy(x: number, y: number): Enemy {
  return {
    id: nextId++,
    x,
    y,
    vx: 0,
    vy: 0,
    radius: CONFIG.ENEMY_RADIUS,
    hp: CONFIG.ENEMY_HP,
    maxHp: CONFIG.ENEMY_HP,
    atk: CONFIG.ENEMY_ATK,
    def: CONFIG.ENEMY_DEF,
    speed: CONFIG.ENEMY_SPEED,
    damageCooldown: 0,
  };
}

export function updateEnemy(
  enemy: Enemy,
  playerX: number,
  playerY: number,
  dt: number
): void {
  const dist = distance(enemy.x, enemy.y, playerX, playerY);
  if (dist > 0) {
    const dx = (playerX - enemy.x) / dist;
    const dy = (playerY - enemy.y) / dist;
    enemy.vx = dx * enemy.speed;
    enemy.vy = dy * enemy.speed;
    enemy.x += enemy.vx * (dt / 1000) * 60;
    enemy.y += enemy.vy * (dt / 1000) * 60;
  }
  if (enemy.damageCooldown > 0) enemy.damageCooldown -= dt;
}

export function clampToArena(e: Enemy): void {
  const r = CONFIG.ARENA_PADDING + e.radius;
  e.x = Math.max(r, Math.min(CONFIG.ARENA_WIDTH - r, e.x));
  e.y = Math.max(r, Math.min(CONFIG.ARENA_HEIGHT - r, e.y));
}

export function circlesOverlap(
  x1: number,
  y1: number,
  r1: number,
  x2: number,
  y2: number,
  r2: number
): boolean {
  return distance(x1, y1, x2, y2) < r1 + r2;
}
