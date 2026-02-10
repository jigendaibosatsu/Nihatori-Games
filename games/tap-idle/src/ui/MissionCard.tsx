import type { MissionDef } from '../game/types';
import { applyMissionReward } from '../game/store';
import { formatNumber } from './format';

interface MissionCardProps {
  def: MissionDef;
  progress: number;
  totalEarned: number;
  completed: boolean;
}

function getProgress(def: MissionDef, progress: number, totalEarned: number): number {
  if (def.type === 'tap') return progress;
  if (def.type === 'buyUpgrade') return progress;
  if (def.type === 'earn') return totalEarned;
  return 0;
}

export function MissionCard({ def, progress, totalEarned, completed }: MissionCardProps) {
  const current = getProgress(def, progress, totalEarned);
  const done = current >= def.target;
  const canClaim = done && !completed;

  const handleClaim = () => {
    if (canClaim) {
      applyMissionReward(def.id, def.rewardType, def.rewardValue);
    }
  };

  return (
    <div className={`card mission-card ${completed ? 'completed' : ''}`}>
      <div className="card-header">
        <h3>{def.name}</h3>
        {completed ? (
          <span className="done">完了</span>
        ) : (
          <span className="progress">{current}/{def.target}</span>
        )}
      </div>
      <p className="card-desc">
        報酬: {def.rewardType === 'money'
          ? `${formatNumber(def.rewardValue)}`
          : `${def.rewardValue}倍 5分`}
      </p>
      {canClaim && (
        <button type="button" className="card-buy" onClick={handleClaim}>
          受け取る
        </button>
      )}
    </div>
  );
}
