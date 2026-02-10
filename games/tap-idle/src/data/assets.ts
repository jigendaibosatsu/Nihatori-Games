import type { AssetDef } from '../game/types';

export const ASSETS: AssetDef[] = [
  {
    id: 'cart',
    name: '屋台',
    description: '1秒あたり1お金',
    baseCost: 10,
    costScaling: 1.15,
    baseYield: 1,
  },
  {
    id: 'cafe',
    name: 'カフェ',
    description: '1秒あたり10お金',
    baseCost: 100,
    costScaling: 1.2,
    baseYield: 10,
  },
  {
    id: 'factory',
    name: '工場',
    description: '1秒あたり50お金',
    baseCost: 1000,
    costScaling: 1.25,
    baseYield: 50,
  },
  {
    id: 'tower',
    name: 'タワー',
    description: '1秒あたり200お金',
    baseCost: 10000,
    costScaling: 1.3,
    baseYield: 200,
  },
];
