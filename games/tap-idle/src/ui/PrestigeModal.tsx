import { prestige } from '../game/store';
import { formatNumber } from './format';

interface PrestigeModalProps {
  pointsGained: number;
  totalEarned: number;
  onClose: () => void;
}

export function PrestigeModal({ pointsGained, totalEarned, onClose }: PrestigeModalProps) {
  const handleConfirm = () => {
    prestige();
    onClose();
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-box">
        <h2>プレステージ</h2>
        <p>
          総収入 {formatNumber(totalEarned)} でリセットすると、
          <strong> {pointsGained} pt</strong> を獲得します。
        </p>
        <p className="modal-note">お金・アップグレード・資産がリセットされ、永続ボーナスが付与されます。</p>
        <div className="modal-actions">
          <button type="button" className="btn-primary" onClick={handleConfirm}>
            リセット
          </button>
          <button type="button" className="btn-secondary" onClick={onClose}>
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
}
