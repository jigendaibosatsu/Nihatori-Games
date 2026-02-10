import type { AssetDef } from '../game/types';

export const ASSETS: AssetDef[] = [
  {
    id: 'cart',
    name: '銅貨スタンド',
    description: '銅貨を売って1秒あたり1コイン。/assets/money/copper_coins.png',
    baseCost: 10,
    costScaling: 1.15,
    baseYield: 1,
  },
  {
    id: 'cafe',
    name: '銀貨カフェ',
    description: '銀貨でおつりが出るカフェ。1秒あたり10コイン。/assets/money/sibver_coins.png',
    baseCost: 100,
    costScaling: 1.2,
    baseYield: 10,
  },
  {
    id: 'factory',
    name: '金貨工場',
    description: '金貨を鋳造する工場。1秒あたり50コイン。/assets/money/gold_coins128.png',
    baseCost: 1000,
    costScaling: 1.25,
    baseYield: 50,
  },
  {
    id: 'tower',
    name: '宝石タワー',
    description: '宝石の光るタワー。1秒あたり200コイン。/assets/ores/diamond.png',
    baseCost: 10000,
    costScaling: 1.3,
    baseYield: 200,
  },
];
