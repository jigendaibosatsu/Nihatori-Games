/**
 * Gesture recognition for PuniPuni Arena
 * - Double-click: Stone (on char) / Hyper (on empty)
 * - Rapid clicks: Multiply
 * - Spin: circular motion around character
 * - Giant: hold on char + vertical drag
 */

import { CONFIG } from './config';
import { distance } from './character';

export interface GestureState {
  clickHistory: Array<{ time: number; x: number; y: number; onChar: boolean }>;
  pointerDownTime: number;
  pointerDownX: number;
  pointerDownY: number;
  pointerDownOnChar: boolean;
  lastAngle: number;
  cumulativeAngle: number;
  lastMoveTime: number;
  verticalStartY: number;
  verticalMoved: boolean;
  lastClickTime: number;
  lastClickX: number;
  lastClickY: number;
  lastClickOnChar: boolean;
}

export function createGestureState(): GestureState {
  return {
    clickHistory: [],
    pointerDownTime: 0,
    pointerDownX: 0,
    pointerDownY: 0,
    pointerDownOnChar: false,
    lastAngle: 0,
    cumulativeAngle: 0,
    lastMoveTime: 0,
  verticalStartY: 0,
  verticalMoved: false,
  lastClickTime: 0,
  lastClickX: 0,
  lastClickY: 0,
  lastClickOnChar: false,
};
}

export type GestureResult =
  | { type: 'none' }
  | { type: 'move'; x: number; y: number }
  | { type: 'attack' }
  | { type: 'double_stone' }
  | { type: 'double_hyper'; x: number; y: number }
  | { type: 'multiply' }
  | { type: 'spin' }
  | { type: 'giant_charge' }
  | { type: 'giant_release' };

/** Record a click and check for Multiply (rapid clicks on character) */
export function recordClick(
  g: GestureState,
  x: number,
  y: number,
  onChar: boolean,
  now: number
): GestureResult {
  g.clickHistory.push({ time: now, x, y, onChar });
  // Prune old clicks outside window
  const cutoff = now - CONFIG.MULTIPLY_TIME_WINDOW_MS;
  g.clickHistory = g.clickHistory.filter((c) => c.time > cutoff);
  const onCharClicks = g.clickHistory.filter((c) => c.onChar);
  if (
    onCharClicks.length >= CONFIG.MULTIPLY_CLICKS_NEEDED &&
    onCharClicks[onCharClicks.length - 1].time - onCharClicks[0].time <=
      CONFIG.MULTIPLY_TIME_WINDOW_MS
  ) {
    g.clickHistory = [];
    return { type: 'multiply' };
  }
  return { type: 'none' };
}

/** Check for double-click (Stone on char, Hyper on empty). Call on pointer DOWN. */
export function checkDoubleClick(
  g: GestureState,
  x: number,
  y: number,
  onChar: boolean,
  now: number
): GestureResult {
  const dt = now - g.lastClickTime;
  const sameSpot = distance(x, y, g.lastClickX, g.lastClickY) < 50;
  if (dt <= CONFIG.DOUBLE_CLICK_THRESHOLD_MS && sameSpot && dt > 0) {
    if (onChar) return { type: 'double_stone' };
    return { type: 'double_hyper', x, y };
  }
  return { type: 'none' };
}

/** Store last click for double-check (call on pointer up when it was a quick tap) */
export function setLastClick(
  g: GestureState,
  x: number,
  y: number,
  onChar: boolean,
  now: number
): void {
  g.lastClickTime = now;
  g.lastClickX = x;
  g.lastClickY = y;
  g.lastClickOnChar = onChar;
}

/** Start tracking pointer down (for spin/giant) */
export function pointerDown(
  g: GestureState,
  x: number,
  y: number,
  charX: number,
  charY: number,
  charR: number,
  now: number
): void {
  g.pointerDownTime = now;
  g.pointerDownX = x;
  g.pointerDownY = y;
  g.pointerDownOnChar = distance(x, y, charX, charY) <= charR + 10;
  g.lastAngle = Math.atan2(y - charY, x - charX);
  g.cumulativeAngle = 0;
  g.lastMoveTime = now;
  g.verticalStartY = y;
  g.verticalMoved = false;
}

/** Update during pointer move - returns Spin or Giant gestures if detected */
export function pointerMove(
  g: GestureState,
  x: number,
  y: number,
  charX: number,
  charY: number,
  charR: number,
  now: number
): { spin: boolean; giantCharge: boolean } {
  if (!g.pointerDownOnChar) return { spin: false, giantCharge: false };

  const dist = distance(x, y, charX, charY);
  if (dist < CONFIG.SPIN_MIN_DISTANCE) return { spin: false, giantCharge: false };

  const angle = Math.atan2(y - charY, x - charX);
  let delta = angle - g.lastAngle;
  if (delta > Math.PI) delta -= Math.PI * 2;
  if (delta < -Math.PI) delta += Math.PI * 2;
  g.cumulativeAngle += Math.abs(delta) * (180 / Math.PI);
  g.lastAngle = angle;

  const verticalDist = Math.abs(y - g.verticalStartY);
  if (verticalDist >= CONFIG.GIANT_MIN_VERTICAL) g.verticalMoved = true;

  const holdTime = now - g.pointerDownTime;
  const spinOk =
    g.cumulativeAngle >= CONFIG.SPIN_ANGLE_THRESHOLD_DEG &&
    holdTime <= CONFIG.SPIN_TIME_WINDOW_MS;
  const giantOk =
    holdTime >= CONFIG.GIANT_HOLD_THRESHOLD_MS && g.verticalMoved;

  return { spin: spinOk, giantCharge: giantOk };
}

export function pointerUp(g: GestureState): void {
  g.pointerDownTime = 0;
}

export function getCumulativeAngle(g: GestureState): number {
  return g.cumulativeAngle;
}
