/**
 * Game store: state + persistence + game loop + offline.
 * No external state lib - subscribe pattern for React.
 */

import type { SaveData } from './types';
import {
  tapIncome,
  idleIncomePerSecond,
  upgradeCost,
  assetCost,
  prestigePointsGained,
  prestigeMultiplier,
  offlineEarnings,
  computeTapPower,
} from './logic';
import { UPGRADES } from '../data/upgrades';
import { ASSETS } from '../data/assets';
import { getTodaysMissions, getTodayKey } from '../data/missions';

const SAVE_KEY = 'tap_idle_save';
const SAVE_VERSION = 1;
const PRESTIGE_THRESHOLD = 1e6;
const OFFLINE_CAP_HOURS = 8;
const AUTO_SAVE_INTERVAL_MS = 10000;

type Subscriber = () => void;

let state: SaveData = createDefaultState();
const subscribers: Subscriber[] = [];
let lastTick = 0;

function createDefaultState(): SaveData {
  const assets: Record<string, number> = {};
  const upgrades: Record<string, number> = {};
  ASSETS.forEach((a) => (assets[a.id] = 0));
  UPGRADES.forEach((u) => (upgrades[u.id] = 0));

  return {
    version: SAVE_VERSION,
    lastSavedAt: Date.now(),
    money: 0,
    totalEarned: 0,
    tapCount: 0,
    assets,
    upgrades,
    prestigePoints: 0,
    missions: { lastDateKey: '', completed: [], progress: {} },
  };
}

function migrateSave(raw: unknown): SaveData {
  const obj = raw as Record<string, unknown>;
  if (!obj || typeof obj !== 'object') return createDefaultState();

  const v = (obj.version as number) ?? 0;
  let s: SaveData = {
    version: SAVE_VERSION,
    lastSavedAt: (obj.lastSavedAt as number) ?? Date.now(),
    money: (obj.money as number) ?? 0,
    totalEarned: (obj.totalEarned as number) ?? 0,
    tapCount: (obj.tapCount as number) ?? 0,
    assets: (obj.assets as Record<string, number>) ?? {},
    upgrades: (obj.upgrades as Record<string, number>) ?? {},
    prestigePoints: (obj.prestigePoints as number) ?? 0,
    missions: {
      lastDateKey: (obj.missions as SaveData['missions'])?.lastDateKey ?? '',
      completed: (obj.missions as SaveData['missions'])?.completed ?? [],
      progress: (obj.missions as SaveData['missions'])?.progress ?? {},
    },
    buffExpiresAt: obj.buffExpiresAt as number | undefined,
  };

  if (v < 1) {
    ASSETS.forEach((a) => (s.assets[a.id] ??= 0));
    UPGRADES.forEach((u) => (s.upgrades[u.id] ??= 0));
  }

  return s;
}

function loadState(): SaveData {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return createDefaultState();
    return migrateSave(JSON.parse(raw));
  } catch {
    return createDefaultState();
  }
}

function saveState(): void {
  try {
    state.lastSavedAt = Date.now();
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Save failed', e);
  }
}

function notify(): void {
  subscribers.forEach((cb) => cb());
}

/** Stub for ad - returns true (simulated success) */
export function watchAdStub(): Promise<boolean> {
  return Promise.resolve(true);
}

export function getState(): SaveData {
  return state;
}

export function setState(updater: (s: SaveData) => SaveData): void {
  state = updater(state);
  notify();
}

export function subscribe(cb: Subscriber): () => void {
  subscribers.push(cb);
  return () => {
    const i = subscribers.indexOf(cb);
    if (i >= 0) subscribers.splice(i, 1);
  };
}

function missionMultiplier(): number {
  if (!state.buffExpiresAt || Date.now() > state.buffExpiresAt) return 1;
  return 2;
}

function ensureMissionDayReset(): void {
  const today = getTodayKey();
  if (state.missions.lastDateKey !== today) {
    setState((s) => ({
      ...s,
      missions: {
        lastDateKey: today,
        completed: [],
        progress: {},
      },
    }));
  }
}

export function tap(): number {
  ensureMissionDayReset();
  const prestigeMult = prestigeMultiplier(state.prestigePoints);
  const missionMult = missionMultiplier();
  const tapPower = computeTapPower(state.upgrades);
  const earned = tapIncome(tapPower, prestigeMult, missionMult);

  setState((s) => {
    const tapCount = s.tapCount + 1;
    const progressTap = (s.missions.progress['tap'] ?? 0) + 1;
    return {
      ...s,
      money: Math.min(s.money + earned, 1e15),
      totalEarned: s.totalEarned + earned,
      tapCount,
      missions: {
        ...s.missions,
        progress: { ...s.missions.progress, tap: progressTap },
      },
    };
  });
  return earned;
}

export function buyUpgrade(id: string): boolean {
  ensureMissionDayReset();
  const def = UPGRADES.find((u) => u.id === id);
  if (!def) return false;

  const level = state.upgrades[id] ?? 0;
  if (level >= def.maxLevel) return false;

  const cost = upgradeCost(def, level);
  if (state.money < cost) return false;

  setState((s) => {
    const progressUpgrade = (s.missions.progress['buyUpgrade'] ?? 0) + 1;
    return {
      ...s,
      money: s.money - cost,
      upgrades: { ...s.upgrades, [id]: level + 1 },
      missions: {
        ...s.missions,
        progress: { ...s.missions.progress, buyUpgrade: progressUpgrade },
      },
    };
  });
  return true;
}

export function buyAsset(id: string): boolean {
  const def = ASSETS.find((a) => a.id === id);
  if (!def) return false;

  const owned = state.assets[id] ?? 0;
  const cost = assetCost(def, owned);
  if (state.money < cost) return false;

  setState((s) => ({
    ...s,
    money: s.money - cost,
    assets: { ...s.assets, [id]: owned + 1 },
  }));
  return true;
}

export function prestige(): void {
  if (state.totalEarned < PRESTIGE_THRESHOLD) return;

  const points = prestigePointsGained(state.totalEarned);
  setState((s) => ({
    ...createDefaultState(),
    prestigePoints: s.prestigePoints + points,
  }));
}

export function collectOffline(double: boolean = false): void {
  const elapsed = (Date.now() - state.lastSavedAt) / 1000;
  if (elapsed < 60) return;

  const rate = idleIncomePerSecond(
    state.assets,
    state.upgrades,
    prestigeMultiplier(state.prestigePoints),
    missionMultiplier()
  );
  let earned = offlineEarnings(rate, elapsed, OFFLINE_CAP_HOURS);
  if (double) earned *= 2;

  setState((s) => ({
    ...s,
    money: Math.min(s.money + earned, 1e15),
    totalEarned: s.totalEarned + earned,
    lastSavedAt: Date.now(),
  }));
}

export function applyMissionReward(
  missionId: string,
  rewardType: 'money' | 'multiplier',
  rewardValue: number
): void {
  if (rewardType === 'money') {
    setState((s) => ({
      ...s,
      money: s.money + rewardValue,
      totalEarned: s.totalEarned + rewardValue,
      missions: {
        ...s.missions,
        completed: [...s.missions.completed, missionId],
      },
    }));
  } else {
    const expiresAt = Date.now() + 5 * 60 * 1000;
    setState((s) => ({
      ...s,
      buffExpiresAt: Math.max(s.buffExpiresAt ?? 0, expiresAt),
      missions: {
        ...s.missions,
        completed: [...s.missions.completed, missionId],
      },
    }));
  }
}

/** Run idle income tick - call with delta time (seconds) */
function tickIdle(deltaSec: number): void {
  const rate = idleIncomePerSecond(
    state.assets,
    state.upgrades,
    prestigeMultiplier(state.prestigePoints),
    missionMultiplier()
  );
  const earned = Math.floor(rate * deltaSec);
  if (earned <= 0) return;

  setState((s) => ({
    ...s,
    money: Math.min(s.money + earned, 1e15),
    totalEarned: s.totalEarned + earned,
  }));
}

/** Initialize: load, check offline, start loops */
export function initStore(): {
  offlineEarned: number;
  offlineHours: number;
} {
  state = loadState();
  ensureMissionDayReset();

  const elapsed = (Date.now() - state.lastSavedAt) / 1000;
  const rate = idleIncomePerSecond(
    state.assets,
    state.upgrades,
    prestigeMultiplier(state.prestigePoints),
    missionMultiplier()
  );
  const offlineEarned = elapsed >= 60 ? offlineEarnings(rate, elapsed, OFFLINE_CAP_HOURS) : 0;
  const offlineHours = elapsed / 3600;

  const loop = (now: number) => {
    if (lastTick === 0) lastTick = now;
    const delta = (now - lastTick) / 1000;
    lastTick = now;
    tickIdle(delta);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  window.setInterval(saveState, AUTO_SAVE_INTERVAL_MS);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') saveState();
  });

  return { offlineEarned, offlineHours };
}

export function getIdleRate(): number {
  return idleIncomePerSecond(
    state.assets,
    state.upgrades,
    prestigeMultiplier(state.prestigePoints),
    missionMultiplier()
  );
}

export function canPrestige(): boolean {
  return state.totalEarned >= PRESTIGE_THRESHOLD;
}

export function getPrestigePreview(): number {
  return prestigePointsGained(state.totalEarned);
}

export function getTodaysMissionsFromStore() {
  return getTodaysMissions();
}
