import type { UpgradeDef } from '../game/types';
import { buyUpgrade } from '../game/store';
import { upgradeCost } from '../game/logic';
import { formatNumber } from './format';

interface UpgradeCardProps {
  def: UpgradeDef;
  level: number;
  money: number;
}

export function UpgradeCard({ def, level, money }: UpgradeCardProps) {
  const cost = upgradeCost(def, level);
  const canBuy = level < def.maxLevel && money >= cost;

  return (
    <div className="card upgrade-card">
      <div className="card-header">
        <h3>{def.name}</h3>
        <span className="level">Lv.{level}/{def.maxLevel}</span>
      </div>
      <p className="card-desc">{def.description}</p>
      <button
        type="button"
        className="card-buy"
        disabled={!canBuy}
        onClick={() => buyUpgrade(def.id)}
      >
        {level >= def.maxLevel ? '最大' : `購入 ${formatNumber(cost)}`}
      </button>
    </div>
  );
}
