import { useState } from 'react';
import { tap } from '../game/store';
import { formatNumber } from './format';

export function TapButton() {
  const [floatText, setFloatText] = useState<{ value: number; key: number } | null>(null);

  const handleTap = () => {
    const earned = tap();
    setFloatText({ value: earned, key: Date.now() });
    setTimeout(() => setFloatText(null), 800);
  };

  return (
    <div className="tap-button-wrap">
      <button
        type="button"
        className="tap-button"
        onClick={handleTap}
        aria-label="お金を稼ぐ"
      >
        <img src="/assets/money/coin_32.png" alt="" className="tap-button-icon" />
        <span className="tap-button-label">タップ</span>
      </button>
      {floatText && (
        <span key={floatText.key} className="tap-float">
          +{formatNumber(floatText.value)}
        </span>
      )}
    </div>
  );
}
