import { formatNumber } from './format';

interface TopBarProps {
  money: number;
  incomePerSecond: number;
}

export function TopBar({ money, incomePerSecond }: TopBarProps) {
  return (
    <header className="top-bar">
      <div className="top-bar-money">
        <span className="icon-wrap">
          <img src="/assets/money/gold_coins128.png" alt="" />
        </span>
        <div className="text">
          <span className="label">所持金</span>
          <span className="value">{formatNumber(money)}</span>
        </div>
      </div>
      <div className="top-bar-income">
        <span className="label">+{formatNumber(incomePerSecond)}/秒</span>
      </div>
    </header>
  );
}
