import { formatNumber } from './format';

interface TopBarProps {
  money: number;
  incomePerSecond: number;
}

export function TopBar({ money, incomePerSecond }: TopBarProps) {
  return (
    <header className="top-bar">
      <div className="top-bar-money">
        <span className="label">所持金</span>
        <span className="value">{formatNumber(money)}</span>
      </div>
      <div className="top-bar-income">
        <span className="label">+{formatNumber(incomePerSecond)}/秒</span>
      </div>
    </header>
  );
}
