/**
 * Pure game logic - no side effects, testable.
 * All formulas and calculations.
 */

import type { UpgradeDef, AssetDef } from './types';
import { UPGRADES } from '../data/upgrades';
import { ASSETS } from '../data/assets';

const SOFT_CAP = 1e15;

function clamp(n: number): number {
  return Math.min(Math.max(n, 0), SOFT_CAP);
}

/** Format number: 1,234 → 12.3K → 4.56M → 7.89B → scientific */
export function formatNumber(n: number): string {
  const x = Math.abs(n);
  if (x >= 1e12) return (n / 1e12).toFixed(2).replace(/\.?0+$/, '') + 'T';
  if (x >= 1e9) return (n / 1e9).toFixed(2).replace(/\.?0+$/, '') + 'B';
  if (x >= 1e6) return (n / 1e6).toFixed(2).replace(/\.?0+$/, '') + 'M';
  if (x >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
  return Math.floor(n).toLocaleString('ja-JP');
}

/** Base tap power = 1. Multiplied by upgrades and prestige. */
export function tapIncome(
  tapPower: number,
  prestigeMult: number,
  missionMult: number = 1
): number {
  return clamp(Math.floor(tapPower * prestigeMult * missionMult));
}

/** Idle income per second from assets, upgrades, prestige */
export function idleIncomePerSecond(
  assets: Record<string, number>,
  upgrades: Record<string, number>,
  prestigeMult: number,
  missionMult: number = 1
): number {
  let base = 0;
  for (const a of ASSETS) {
    const owned = assets[a.id] ?? 0;
    base += owned * a.baseYield;
  }
  let idleMult = 1;
  for (const u of UPGRADES) {
    if (u.effectType !== 'idleMultiplier') continue;
    const lv = upgrades[u.id] ?? 0;
    idleMult *= Math.pow(u.effectValue, lv);
  }
  return clamp(base * idleMult * prestigeMult * missionMult);
}

/** Upgrade cost: baseCost * costScaling^level */
export function upgradeCost(def: UpgradeDef, level: number): number {
  if (level >= def.maxLevel) return Infinity;
  return Math.floor(def.baseCost * Math.pow(def.costScaling, level));
}

/** Asset cost: baseCost * costScaling^owned */
export function assetCost(def: AssetDef, owned: number): number {
  return Math.floor(def.baseCost * Math.pow(def.costScaling, owned));
}

/** Prestige points from totalEarned (log-based) */
export function prestigePointsGained(totalEarned: number): number {
  if (totalEarned < 1e6) return 0;
  return Math.floor(Math.log10(totalEarned / 1e6) * 5) + 1;
}

/** Prestige multiplier for tap and idle. 1 + 0.1 * points */
export function prestigeMultiplier(points: number): number {
  return 1 + 0.1 * points;
}

/** Offline earnings: rate * seconds, capped at capHours */
export function offlineEarnings(
  ratePerSecond: number,
  secondsAway: number,
  capHours: number = 8
): number {
  const capSeconds = capHours * 3600;
  const effectiveSeconds = Math.min(secondsAway, capSeconds);
  return clamp(Math.floor(ratePerSecond * effectiveSeconds));
}

/** Compute effective tap power from upgrades */
export function computeTapPower(upgrades: Record<string, number>): number {
  let mult = 1;
  for (const u of UPGRADES) {
    if (u.effectType !== 'tapMultiplier') continue;
    const lv = upgrades[u.id] ?? 0;
    mult *= Math.pow(u.effectValue, lv);
  }
  return mult;
}
