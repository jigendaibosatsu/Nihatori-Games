/**
 * PuniPuni Arena - Main game loop and state machine
 * Fixed timestep 60Hz, gesture handling, combat, win/lose
 */

import { CONFIG } from './config';
import {
  PuniPuni,
  createPuniPuni,
  computeDamage,
  distance,
  isPointInCircle,
  Clone,
} from './character';
import { Enemy, createEnemy, updateEnemy, clampToArena, circlesOverlap } from './enemy';
import {
  GestureState,
  createGestureState,
  recordClick,
  checkDoubleClick,
  setLastClick,
  pointerDown,
  pointerMove,
  pointerUp,
  GestureResult,
} from './gesture';
import { getPointerPosition, createInputState, InputState } from './input';
import { draw } from './render';
import { updateUI } from './ui';

const FIXED_DT = CONFIG.FIXED_DT_MS;

export type GamePhase = 'playing' | 'won' | 'lost';

export interface GameState {
  phase: GamePhase;
  player: PuniPuni;
  enemies: Enemy[];
  gesture: GestureState;
  input: InputState;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  lastTime: number;
  accumulator: number;
  gameTime: number;
  enemiesDefeated: number;
  screenShake: number;
  hitFlash: number;
}

export function createGame(canvas: HTMLCanvasElement): GameState {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2D context');

  return {
    phase: 'playing',
    player: createPuniPuni(),
    enemies: [] as Enemy[],
    gesture: createGestureState(),
    input: createInputState(),
    canvas,
    ctx,
    lastTime: 0,
    accumulator: 0,
    gameTime: 0,
    enemiesDefeated: 0,
    screenShake: 0,
    hitFlash: 0,
  };
}

function canAcceptInput(p: PuniPuni): boolean {
  return (
    p.state !== CONFIG.STATES.HITSTUN &&
    p.state !== CONFIG.STATES.DOWN
  );
}

function tickCooldowns(p: PuniPuni, dt: number): void {
  if (p.cooldownStone > 0) p.cooldownStone -= dt;
  if (p.cooldownHyper > 0) p.cooldownHyper -= dt;
  if (p.cooldownMultiply > 0) p.cooldownMultiply -= dt;
  if (p.cooldownSpin > 0) p.cooldownSpin -= dt;
  if (p.cooldownGiant > 0) p.cooldownGiant -= dt;
}

function updatePlayerState(p: PuniPuni, dt: number): void {
  if (p.invulnerable > 0) p.invulnerable -= dt;

  tickCooldowns(p, dt);

  // State timers (skip for ATTACK - handled below)
  if (p.state !== CONFIG.STATES.ATTACK && p.stateTimer > 0) {
    p.stateTimer -= dt;
    if (p.stateTimer <= 0) {
      if (p.state === CONFIG.STATES.HITSTUN) {
        p.state = CONFIG.STATES.DOWN;
        p.stateTimer = CONFIG.DOWN_MS;
      } else if (p.state === CONFIG.STATES.DOWN) {
        p.state = CONFIG.STATES.IDLE;
      } else if (p.state === CONFIG.STATES.STONE) {
        p.state = CONFIG.STATES.IDLE;
        p.stoneDefBoost = 1;
        p.stoneSpeedMult = 1;
        p.cooldownStone = CONFIG.STONE_COOLDOWN_MS;
      } else if (p.state === CONFIG.STATES.HYPER) {
        p.state = CONFIG.STATES.IDLE;
        p.cooldownHyper = CONFIG.HYPER_COOLDOWN_MS;
      } else if (p.state === CONFIG.STATES.SPIN) {
        p.state = CONFIG.STATES.IDLE;
        p.cooldownSpin = CONFIG.SPIN_COOLDOWN_MS;
      } else if (p.state === CONFIG.STATES.GIANT_SLAM) {
        p.state = CONFIG.STATES.IDLE;
        p.cooldownGiant = CONFIG.GIANT_COOLDOWN_MS;
      }
    }
  }

  // Attack phase
  if (p.attackPhase !== 'idle' && p.state === CONFIG.STATES.ATTACK) {
    p.stateTimer -= dt;
    if (p.attackPhase === 'startup' && p.stateTimer <= 0) {
      p.attackPhase = 'active';
      p.attackHitDealt = false;
      p.stateTimer = CONFIG.ATTACK_ACTIVE_MS;
    } else if (p.attackPhase === 'active' && p.stateTimer <= 0) {
      p.attackPhase = 'recovery';
      p.stateTimer = CONFIG.ATTACK_RECOVERY_MS;
    } else if (p.attackPhase === 'recovery' && p.stateTimer <= 0) {
      p.attackPhase = 'idle';
      p.state = CONFIG.STATES.IDLE;
    }
  }
}

function applyMovement(gs: GameState, p: PuniPuni, dt: number): void {
  const speed =
    (CONFIG.CHARACTER_SPEED * p.stoneSpeedMult * (dt / 1000)) * 60;
  if (gs.input.moveTarget) {
    const dx = gs.input.moveTarget.x - p.x;
    const dy = gs.input.moveTarget.y - p.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 5) {
      p.x += (dx / dist) * Math.min(speed, dist);
      p.y += (dy / dist) * Math.min(speed, dist);
    } else {
      gs.input.moveTarget = null;
    }
  }
  p.x = Math.max(p.radius, Math.min(CONFIG.ARENA_WIDTH - p.radius, p.x));
  p.y = Math.max(p.radius, Math.min(CONFIG.ARENA_HEIGHT - p.radius, p.y));
}

function processGestureResult(
  gs: GameState,
  result: GestureResult,
  now: number
): void {
  const p = gs.player;
  if (result.type === 'none') return;
  if (!canAcceptInput(p)) return;

  switch (result.type) {
    case 'move':
      if (p.state === CONFIG.STATES.IDLE || p.state === CONFIG.STATES.MOVE) {
        gs.input.moveTarget = { x: result.x, y: result.y };
        p.state = CONFIG.STATES.MOVE;
      }
      break;
    case 'attack':
      if (
        (p.state === CONFIG.STATES.IDLE || p.state === CONFIG.STATES.MOVE) &&
        p.attackPhase === 'idle'
      ) {
        p.state = CONFIG.STATES.ATTACK;
        p.attackPhase = 'startup';
        p.stateTimer = CONFIG.ATTACK_STARTUP_MS;
      }
      break;
    case 'double_stone':
      if (
        p.state <= CONFIG.STATES.ATTACK &&
        p.cooldownStone <= 0
      ) {
        p.state = CONFIG.STATES.STONE;
        p.stateTimer = CONFIG.STONE_DURATION_MS;
        p.invulnerable = CONFIG.STONE_I_FRAMES_MS;
        p.stoneDefBoost = CONFIG.STONE_DEF_BOOST;
        p.stoneSpeedMult = CONFIG.STONE_SPEED_MULT;
      }
      break;
    case 'double_hyper':
      if (
        p.state <= CONFIG.STATES.ATTACK &&
        p.cooldownHyper <= 0 &&
        p.energy >= CONFIG.HYPER_ENERGY_COST
      ) {
        p.energy -= CONFIG.HYPER_ENERGY_COST;
        p.hyperDamageDealt = false;
        const dx = result.x - p.x;
        const dy = result.y - p.y;
        const dist = Math.hypot(dx, dy) || 1;
        p.hyperDirX = (dx / dist) * CONFIG.HYPER_DASH_SPEED;
        p.hyperDirY = (dy / dist) * CONFIG.HYPER_DASH_SPEED;
        p.state = CONFIG.STATES.HYPER;
        p.stateTimer = CONFIG.HYPER_DURATION_MS;
      }
      break;
    case 'multiply':
      if (p.state <= CONFIG.STATES.ATTACK && p.cooldownMultiply <= 0) {
        const n =
          CONFIG.MULTIPLY_CLONE_COUNT_MIN +
          Math.floor(
            Math.random() *
              (CONFIG.MULTIPLY_CLONE_COUNT_MAX - CONFIG.MULTIPLY_CLONE_COUNT_MIN + 1)
          );
        for (let i = 0; i < n; i++) {
          const angle = (Math.PI * 2 * i) / n + Math.random() * 0.5;
          p.clones.push({
            x: p.x + Math.cos(angle) * 40,
            y: p.y + Math.sin(angle) * 40,
            radius: CONFIG.MULTIPLY_CLONE_RADIUS,
            lifetime: CONFIG.MULTIPLY_CLONE_LIFETIME_MS,
            maxLifetime: CONFIG.MULTIPLY_CLONE_LIFETIME_MS,
            lastAttackTime: 0,
          });
        }
        p.cooldownMultiply = CONFIG.MULTIPLY_COOLDOWN_MS;
      }
      break;
    case 'spin':
      if (
        p.state <= CONFIG.STATES.ATTACK &&
        p.state !== CONFIG.STATES.SPIN &&
        p.cooldownSpin <= 0
      ) {
        p.state = CONFIG.STATES.SPIN;
        p.stateTimer = CONFIG.SPIN_DURATION_MS;
        p.spinAngle = 0;
      }
      break;
    case 'giant_charge':
      if (
        p.state <= CONFIG.STATES.ATTACK &&
        p.state !== CONFIG.STATES.GIANT_CHARGE &&
        p.cooldownGiant <= 0
      ) {
        p.state = CONFIG.STATES.GIANT_CHARGE;
        p.stateTimer = CONFIG.GIANT_CHARGE_MS;
        p.giantScale = 1;
        p.giantDamageDealt = false;
      }
      break;
    case 'giant_release':
      if (p.state === CONFIG.STATES.GIANT_CHARGE) {
        p.state = CONFIG.STATES.GIANT_SLAM;
        p.stateTimer = CONFIG.GIANT_SLAM_MS;
        p.giantSlamY = p.y;
      }
      break;
  }
}

function fixedUpdate(gs: GameState): void {
  const p = gs.player;
  const dt = FIXED_DT;

  // Hyper dash movement
  if (p.state === CONFIG.STATES.HYPER) {
    p.x += p.hyperDirX * (dt / 1000) * 60;
    p.y += p.hyperDirY * (dt / 1000) * 60;
    p.x = Math.max(p.radius, Math.min(CONFIG.ARENA_WIDTH - p.radius, p.x));
    p.y = Math.max(p.radius, Math.min(CONFIG.ARENA_HEIGHT - p.radius, p.y));
  }
  // Stone / Idle / Move / other: allow movement
  else if (
    p.state === CONFIG.STATES.IDLE ||
    p.state === CONFIG.STATES.MOVE ||
    p.state === CONFIG.STATES.STONE
  ) {
    applyMovement(gs, p, dt);
  }

  // Spin - damage enemies in radius every SPIN_TICK_MS
  if (p.state === CONFIG.STATES.SPIN) {
    p.spinAngle += (360 / CONFIG.SPIN_DURATION_MS) * dt;
    if (gs.gameTime - p.spinLastDamageTime >= CONFIG.SPIN_TICK_MS) {
      p.spinLastDamageTime = gs.gameTime;
      gs.enemies.forEach((e) => {
      if (distance(p.x, p.y, e.x, e.y) <= CONFIG.SPIN_AOE_RADIUS) {
        const dmg = computeDamage(
          p.atk,
          e.def,
          p.condition,
          CONFIG.SPIN_MULTIPLIER
        );
        e.hp -= dmg;
        if (e.hp <= 0) {
          gs.enemiesDefeated++;
          p.energy = Math.min(
            CONFIG.ENERGY_MAX,
            p.energy + CONFIG.ENERGY_GAIN_PER_HIT
          );
        }
      }
    });
    }
  }

  // Giant slam - damage once at midpoint
  if (
    p.state === CONFIG.STATES.GIANT_SLAM &&
    p.stateTimer <= CONFIG.GIANT_SLAM_MS * 0.5 &&
    !p.giantDamageDealt
  ) {
    p.giantDamageDealt = true;
    const dmgMult = CONFIG.GIANT_MULTIPLIER;
    gs.enemies.forEach((e) => {
      if (distance(p.x, p.y, e.x, e.y) <= CONFIG.GIANT_AOE_RADIUS) {
        const dmg = computeDamage(p.atk, e.def, p.condition, dmgMult);
        e.hp -= dmg;
        if (e.hp <= 0) {
          gs.enemiesDefeated++;
          p.energy = Math.min(
            CONFIG.ENERGY_MAX,
            p.energy + CONFIG.ENERGY_GAIN_PER_HIT
          );
        }
      }
    });
  }

  // Attack active - damage enemies in range (once per attack)
  if (p.attackPhase === 'active' && !p.attackHitDealt) {
    p.attackHitDealt = true;
    gs.enemies.forEach((e) => {
      if (distance(p.x, p.y, e.x, e.y) <= CONFIG.ATTACK_RANGE + e.radius) {
        const dmg = computeDamage(
          p.atk,
          e.def,
          p.condition,
          CONFIG.ATTACK_MULTIPLIER
        );
        e.hp -= dmg;
        if (e.hp <= 0) {
          gs.enemiesDefeated++;
          p.energy = Math.min(
            CONFIG.ENERGY_MAX,
            p.energy + CONFIG.ENERGY_GAIN_PER_HIT
          );
        }
      }
    });
    // Clones assist
    p.clones.forEach((c) => {
      const nearest = gs.enemies.reduce<Enemy | null>((a, e) => {
        if (e.hp <= 0) return a;
        const d = distance(c.x, c.y, e.x, e.y);
        if (!a || d < distance(c.x, c.y, a.x, a.y)) return e;
        return a;
      }, null);
      if (nearest && distance(c.x, c.y, nearest.x, nearest.y) < 50) {
        const now = gs.gameTime;
        if (now - c.lastAttackTime > 500) {
          const dmg = Math.floor(
            computeDamage(p.atk, nearest.def, p.condition, CONFIG.MULTIPLY_CLONE_DAMAGE_MULT)
          );
          nearest.hp -= dmg;
          c.lastAttackTime = now;
          if (nearest.hp <= 0) gs.enemiesDefeated++;
        }
      }
    });
  }

  // Hyper - damage at end of dash (once)
  if (p.state === CONFIG.STATES.HYPER && p.stateTimer <= 50 && !p.hyperDamageDealt) {
    p.hyperDamageDealt = true;
    gs.enemies.forEach((e) => {
      if (distance(p.x, p.y, e.x, e.y) <= CONFIG.HYPER_AOE_RADIUS) {
        const dmg = computeDamage(
          p.atk,
          e.def,
          p.condition,
          CONFIG.HYPER_MULTIPLIER
        );
        e.hp -= dmg;
        if (e.hp <= 0) {
          gs.enemiesDefeated++;
          p.energy = Math.min(
            CONFIG.ENERGY_MAX,
            p.energy + CONFIG.ENERGY_GAIN_PER_HIT
          );
        }
      }
    });
  }

  // Update clones
  p.clones = p.clones.filter((c) => {
    c.lifetime -= dt;
    if (c.lifetime <= 0) return false;
    const nearest = gs.enemies.find(
      (e) => e.hp > 0 && distance(c.x, c.y, e.x, e.y) < 150
    );
    if (nearest) {
      const dx = nearest.x - c.x;
      const dy = nearest.y - c.y;
      const dist = Math.hypot(dx, dy) || 1;
      const spd = 3 * (dt / 1000) * 60;
      c.x += (dx / dist) * Math.min(spd, dist);
      c.y += (dy / dist) * Math.min(spd, dist);
    }
    return true;
  });

  // Enemies
  gs.enemies.forEach((e) => updateEnemy(e, p.x, p.y, dt));
  gs.enemies.forEach(clampToArena);
  gs.enemies = gs.enemies.filter((e) => e.hp > 0);

  // Enemy contact damage
  gs.enemies.forEach((e) => {
    if (
      circlesOverlap(p.x, p.y, p.radius, e.x, e.y, e.radius) &&
      e.damageCooldown <= 0 &&
      p.invulnerable <= 0
    ) {
      const def = p.def * p.stoneDefBoost;
      const dmg = computeDamage(e.atk, def, 1, 1);
      p.hp -= dmg;
      e.damageCooldown = CONFIG.ENEMY_DAMAGE_COOLDOWN_MS;
      const dx = p.x - e.x;
      const dy = p.y - e.y;
      const dist = Math.hypot(dx, dy) || 1;
      p.vx = (dx / dist) * CONFIG.PLAYER_KNOCKBACK;
      p.vy = (dy / dist) * CONFIG.PLAYER_KNOCKBACK;
      p.state = CONFIG.STATES.HITSTUN;
      p.stateTimer = CONFIG.HITSTUN_MS;
      p.invulnerable = CONFIG.HITSTUN_MS;
      gs.screenShake = CONFIG.SCREEN_SHAKE_AMOUNT;
      gs.hitFlash = CONFIG.HIT_FLASH_MS;
      if (p.hp <= 0) gs.phase = 'lost';
    }
  });

  // Apply knockback
  if (p.vx !== 0 || p.vy !== 0) {
    p.x += p.vx * (dt / 1000) * 60;
    p.y += p.vy * (dt / 1000) * 60;
    p.vx *= 0.85;
    p.vy *= 0.85;
    p.x = Math.max(p.radius, Math.min(CONFIG.ARENA_WIDTH - p.radius, p.x));
    p.y = Math.max(p.radius, Math.min(CONFIG.ARENA_HEIGHT - p.radius, p.y));
  }

  updatePlayerState(p, dt);
  gs.gameTime += dt;

  if (p.energy < CONFIG.ENERGY_MAX)
    p.energy = Math.min(
      CONFIG.ENERGY_MAX,
      p.energy + CONFIG.ENERGY_DECAY_RATE * (dt / 1000) * 60
    );
}

function spawnEnemy(gs: GameState): void {
  const angle = Math.random() * Math.PI * 2;
  const dist = 250 + Math.random() * 100;
  const x =
    CONFIG.ARENA_WIDTH / 2 + Math.cos(angle) * dist;
  const y =
    CONFIG.ARENA_HEIGHT / 2 + Math.sin(angle) * dist;
  gs.enemies.push(createEnemy(x, y));
}

export function setupInput(gs: GameState): void {
  const canvas = gs.canvas;
  const p = gs.player;

  canvas.addEventListener(
    'pointerdown',
    (e: PointerEvent) => {
      e.preventDefault();
      const { x, y } = getPointerPosition(e, canvas);
      const onChar = isPointInCircle(x, y, p.x, p.y, p.radius + 10);
      const now = performance.now();

      if (CONFIG.POINTER_CAPTURE_ENABLED) {
        canvas.setPointerCapture(e.pointerId);
      }

      pointerDown(gs.gesture, x, y, p.x, p.y, p.radius, now);

      const double = checkDoubleClick(gs.gesture, x, y, onChar, now);
      if (double.type !== 'none') {
        processGestureResult(gs, double, now);
        return;
      }

      const multiply = recordClick(gs.gesture, x, y, onChar, now);
      if (multiply.type !== 'none') {
        processGestureResult(gs, multiply, now);
        return;
      }

      if (onChar && canAcceptInput(p)) {
        processGestureResult(gs, { type: 'attack' }, now);
      } else {
        processGestureResult(gs, { type: 'move', x, y }, now);
      }
    },
    { passive: false }
  );

  canvas.addEventListener(
    'pointermove',
    (e: PointerEvent) => {
      const { x, y } = getPointerPosition(e, canvas);
      const { spin, giantCharge } = pointerMove(
        gs.gesture,
        x,
        y,
        p.x,
        p.y,
        p.radius,
        performance.now()
      );
      if (spin) processGestureResult(gs, { type: 'spin' }, performance.now());
      if (giantCharge)
        processGestureResult(gs, { type: 'giant_charge' }, performance.now());
    },
    { passive: true }
  );

  canvas.addEventListener(
    'pointerup',
    (e: PointerEvent) => {
      const { x, y } = getPointerPosition(e, canvas);
      const onChar = isPointInCircle(x, y, p.x, p.y, p.radius + 10);
      const now = performance.now();
      if (
        gs.gesture.pointerDownOnChar &&
        gs.player.state === CONFIG.STATES.GIANT_CHARGE
      ) {
        processGestureResult(gs, { type: 'giant_release' }, now);
      }
      setLastClick(gs.gesture, x, y, onChar, now);
      pointerUp(gs.gesture);
    },
    { passive: true }
  );

  canvas.addEventListener(
    'contextmenu',
    (e) => e.preventDefault(),
    { passive: false }
  );
}

let lastSpawnTime = 0;

export function gameLoop(gs: GameState, time: number): void {
  const delta = time - gs.lastTime;
  gs.lastTime = time;

  gs.accumulator += Math.min(delta, 250);
  while (gs.accumulator >= FIXED_DT && gs.phase === 'playing') {
    fixedUpdate(gs);
    gs.accumulator -= FIXED_DT;

    if (gs.gameTime - lastSpawnTime >= CONFIG.ENEMY_SPAWN_INTERVAL_MS) {
      spawnEnemy(gs);
      lastSpawnTime = gs.gameTime;
    }

    if (
      gs.gameTime >= CONFIG.SURVIVAL_TIME_MS ||
      gs.enemiesDefeated >= CONFIG.ENEMIES_TO_DEFEAT
    ) {
      gs.phase = 'won';
    }
  }

  if (gs.screenShake > 0) gs.screenShake -= 2;
  if (gs.hitFlash > 0) gs.hitFlash -= 16;

  draw(gs);
  updateUI(gs);
  requestAnimationFrame((t) => gameLoop(gs, t));
}
