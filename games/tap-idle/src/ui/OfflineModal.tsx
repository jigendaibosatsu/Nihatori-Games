import { useState } from 'react';
import { collectOffline, watchAdStub } from '../game/store';
import { formatNumber } from './format';

interface OfflineModalProps {
  earned: number;
  hours: number;
  onClose: () => void;
}

export function OfflineModal({ earned, hours, onClose }: OfflineModalProps) {
  const [loading, setLoading] = useState(false);

  const handleCollect = () => {
    collectOffline(false);
    onClose();
  };

  const handleCollectDouble = async () => {
    setLoading(true);
    const ok = await watchAdStub();
    setLoading(false);
    if (ok) {
      collectOffline(true);
      onClose();
    }
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-box">
        <h2>おかえり！</h2>
        <p>
          {hours.toFixed(1)} 時間の間に <strong>+{formatNumber(earned)}</strong> 稼いだ
        </p>
        <div className="modal-actions">
          <button type="button" className="btn-primary" onClick={handleCollect}>
            受け取る
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={handleCollectDouble}
            disabled={loading}
          >
            2倍でもらう
          </button>
        </div>
      </div>
    </div>
  );
}
