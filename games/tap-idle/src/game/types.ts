/** Game state types */

export interface SaveData {
  version: number;
  lastSavedAt: number;
  money: number;
  totalEarned: number;
  tapCount: number;
  assets: Record<string, number>;
  upgrades: Record<string, number>;
  prestigePoints: number;
  missions: {
    lastDateKey: string;
    completed: string[];
    progress: Record<string, number>;
  };
  /** Temporary 5-min multiplier expires at timestamp */
  buffExpiresAt?: number;
}

export interface UpgradeDef {
  id: string;
  name: string;
  description: string;
  baseCost: number;
  costScaling: number;
  maxLevel: number;
  effectType: 'tapMultiplier' | 'idleMultiplier';
  effectValue: number;
  branch: 'tap' | 'idle';
}

export interface AssetDef {
  id: string;
  name: string;
  description: string;
  baseCost: number;
  costScaling: number;
  baseYield: number;
}

export type MissionType = 'tap' | 'buyUpgrade' | 'earn';

export interface MissionDef {
  id: string;
  type: MissionType;
  target: number;
  rewardType: 'money' | 'multiplier';
  rewardValue: number;
  name: string;
}
