import type { AssetDef } from '../game/types';
import { buyAsset } from '../game/store';
import { assetCost } from '../game/logic';
import { formatNumber } from './format';

interface AssetCardProps {
  def: AssetDef;
  owned: number;
  money: number;
}

export function AssetCard({ def, owned, money }: AssetCardProps) {
  const cost = assetCost(def, owned);
  const canBuy = money >= cost;

  return (
    <div className="card asset-card">
      <div className="card-header">
        <div className="asset-header-main">
          <div className="asset-icon">
            {def.id === 'cart' && <img src="/assets/money/copper_coins.png" alt="" />}
            {def.id === 'cafe' && <img src="/assets/money/sibver_coins.png" alt="" />}
            {def.id === 'factory' && <img src="/assets/money/gold_coins128.png" alt="" />}
            {def.id === 'tower' && <img src="/assets/ores/diamond.png" alt="" />}
          </div>
          <h3>{def.name}</h3>
        </div>
        <span className="owned">×{owned}</span>
      </div>
      <p className="card-desc">{def.description}</p>
      <button
        type="button"
        className="card-buy"
        disabled={!canBuy}
        onClick={() => buyAsset(def.id)}
      >
        購入 {formatNumber(cost)}
      </button>
    </div>
  );
}
