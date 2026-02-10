/**
 * Canvas rendering - PuniPuni blob, enemies, arena, VFX
 */

import { CONFIG } from './config';
import { GameState } from './game';
import { PuniPuni } from './character';

const STATE_NAMES: Record<number, string> = {
  [CONFIG.STATES.IDLE]: 'IDLE',
  [CONFIG.STATES.MOVE]: 'MOVE',
  [CONFIG.STATES.ATTACK]: 'ATTACK',
  [CONFIG.STATES.HYPER]: 'HYPER',
  [CONFIG.STATES.SPIN]: 'SPIN',
  [CONFIG.STATES.GIANT_CHARGE]: 'GIANT_CHARGE',
  [CONFIG.STATES.GIANT_SLAM]: 'GIANT_SLAM',
  [CONFIG.STATES.STONE]: 'STONE',
  [CONFIG.STATES.DOWN]: 'DOWN',
  [CONFIG.STATES.HITSTUN]: 'HITSTUN',
};

function drawBlob(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  alpha = 1
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

export function draw(gs: GameState): void {
  const ctx = gs.ctx;
  const canvas = gs.canvas;
  const p = gs.player;
  const shakeX = (Math.random() - 0.5) * gs.screenShake * 2;
  const shakeY = (Math.random() - 0.5) * gs.screenShake * 2;

  ctx.save();
  ctx.translate(shakeX, shakeY);

  // Hit flash overlay
  if (gs.hitFlash > 0) {
    ctx.fillStyle = `rgba(255,80,80,${gs.hitFlash / CONFIG.HIT_FLASH_MS})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // Arena background
  ctx.fillStyle = '#0f0f1e';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Arena border
  ctx.strokeStyle = '#4a3a6a';
  ctx.lineWidth = 4;
  ctx.strokeRect(
    CONFIG.ARENA_PADDING / 2,
    CONFIG.ARENA_PADDING / 2,
    CONFIG.ARENA_WIDTH - CONFIG.ARENA_PADDING,
    CONFIG.ARENA_HEIGHT - CONFIG.ARENA_PADDING
  );

  // Enemies
  gs.enemies.forEach((e) => {
    drawBlob(ctx, e.x, e.y, e.radius, '#f59e0b');
    const barW = e.radius * 2;
    const barH = 4;
    ctx.fillStyle = '#333';
    ctx.fillRect(e.x - barW / 2, e.y - e.radius - 10, barW, barH);
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(
      e.x - barW / 2,
      e.y - e.radius - 10,
      barW * (e.hp / e.maxHp),
      barH
    );
  });

  // Clones
  p.clones.forEach((c) => {
    const t = c.lifetime / c.maxLifetime;
    drawBlob(ctx, c.x, c.y, c.radius, '#a78bfa', 0.5 + t * 0.5);
  });

  // PuniPuni
  let color = '#60a5fa';
  if (p.state === CONFIG.STATES.STONE) color = '#94a3b8';
  if (p.state === CONFIG.STATES.GIANT_CHARGE || p.state === CONFIG.STATES.GIANT_SLAM)
    color = '#fbbf24';
  if (p.invulnerable > 0 && Math.floor(p.invulnerable / 50) % 2 === 0) {
    ctx.globalAlpha = 0.5;
  }
  const scale = p.state === CONFIG.STATES.GIANT_CHARGE
    ? 1 + (1 - p.stateTimer / CONFIG.GIANT_CHARGE_MS) * 0.5
    : p.state === CONFIG.STATES.GIANT_SLAM
      ? 1.5 - (1 - p.stateTimer / CONFIG.GIANT_SLAM_MS) * 0.5
      : 1;
  drawBlob(ctx, p.x, p.y, p.radius * scale, color);
  ctx.globalAlpha = 1;

  // Spin effect
  if (p.state === CONFIG.STATES.SPIN) {
    ctx.strokeStyle = 'rgba(168,85,247,0.6)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(p.x, p.y, CONFIG.SPIN_AOE_RADIUS, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}
