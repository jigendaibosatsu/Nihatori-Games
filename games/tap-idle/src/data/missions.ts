import type { MissionDef } from '../game/types';

/** Mission templates - actual missions are derived per day via seed */
export const MISSION_TEMPLATES: MissionDef[] = [
  {
    id: 'tap_10',
    type: 'tap',
    target: 10,
    rewardType: 'money',
    rewardValue: 50,
    name: '10回タップする',
  },
  {
    id: 'tap_50',
    type: 'tap',
    target: 50,
    rewardType: 'money',
    rewardValue: 200,
    name: '50回タップする',
  },
  {
    id: 'tap_100',
    type: 'tap',
    target: 100,
    rewardType: 'multiplier',
    rewardValue: 1.5,
    name: '100回タップする',
  },
  {
    id: 'upgrade_1',
    type: 'buyUpgrade',
    target: 1,
    rewardType: 'money',
    rewardValue: 100,
    name: 'アップグレードを1回購入',
  },
  {
    id: 'upgrade_3',
    type: 'buyUpgrade',
    target: 3,
    rewardType: 'money',
    rewardValue: 300,
    name: 'アップグレードを3回購入',
  },
  {
    id: 'earn_1000',
    type: 'earn',
    target: 1000,
    rewardType: 'money',
    rewardValue: 500,
    name: '1000お金を稼ぐ',
  },
  {
    id: 'earn_10000',
    type: 'earn',
    target: 10000,
    rewardType: 'multiplier',
    rewardValue: 2,
    name: '10000お金を稼ぐ',
  },
];

/** Get date string for today (local timezone) - used as seed */
export function getTodayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** Simple deterministic hash from string */
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

/** Pick 3 different missions for today based on date seed */
export function getTodaysMissions(): MissionDef[] {
  const key = getTodayKey();
  const h = hash(key);
  const indices: number[] = [];
  let n = h;
  for (let i = 0; i < 3; i++) {
    const idx = n % MISSION_TEMPLATES.length;
    if (!indices.includes(idx)) {
      indices.push(idx);
    } else {
      n = Math.floor(n / MISSION_TEMPLATES.length) || 1;
      const alt = (idx + i + 1) % MISSION_TEMPLATES.length;
      indices.push(alt);
    }
    n = Math.floor(n / MISSION_TEMPLATES.length) || 1;
  }
  return indices.map((i) => ({ ...MISSION_TEMPLATES[i] }));
}
