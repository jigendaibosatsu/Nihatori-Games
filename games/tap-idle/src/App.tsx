import { useState, useEffect } from 'react';
import {
  getState,
  subscribe,
  initStore,
  getIdleRate,
  canPrestige,
  getPrestigePreview,
  getTodaysMissionsFromStore,
} from './game/store';
import { TopBar } from './ui/TopBar';
import { TapButton } from './ui/TapButton';
import { TabNavigation, type TabId } from './ui/TabNavigation';
import { UpgradeCard } from './ui/UpgradeCard';
import { AssetCard } from './ui/AssetCard';
import { MissionCard } from './ui/MissionCard';
import { PrestigeModal } from './ui/PrestigeModal';
import { OfflineModal } from './ui/OfflineModal';
import { UPGRADES } from './data/upgrades';
import { ASSETS } from './data/assets';
import './App.css';

export default function App() {
  const [, setTick] = useState(0);
  const [tab, setTab] = useState<TabId>('upgrades');
  const [showPrestigeModal, setShowPrestigeModal] = useState(false);
  const [offlineData, setOfflineData] = useState<{ earned: number; hours: number } | null>(null);

  useEffect(() => {
    const { offlineEarned, offlineHours } = initStore();
    if (offlineEarned > 0) {
      setOfflineData({ earned: offlineEarned, hours: offlineHours });
    }
    const unsub = subscribe(() => setTick((n) => n + 1));
    return unsub;
  }, []);

  const state = getState();
  const idleRate = getIdleRate();
  const todaysMissions = getTodaysMissionsFromStore();

  const getMissionProgress = (def: { id: string; type: string }) => {
    if (def.type === 'tap') return state.missions.progress['tap'] ?? 0;
    if (def.type === 'buyUpgrade') return state.missions.progress['buyUpgrade'] ?? 0;
    if (def.type === 'earn') return state.totalEarned;
    return 0;
  };

  return (
    <div className="app">
      <TopBar money={state.money} incomePerSecond={idleRate} />

      <main className="main">
        <TapButton />
      </main>

      <TabNavigation active={tab} onSelect={setTab} />

      <section className="tab-content">
        {tab === 'upgrades' && (
          <div className="card-list">
            {UPGRADES.map((def) => (
              <UpgradeCard
                key={def.id}
                def={def}
                level={state.upgrades[def.id] ?? 0}
                money={state.money}
              />
            ))}
          </div>
        )}
        {tab === 'assets' && (
          <div className="card-list">
            {ASSETS.map((def) => (
              <AssetCard
                key={def.id}
                def={def}
                owned={state.assets[def.id] ?? 0}
                money={state.money}
              />
            ))}
          </div>
        )}
        {tab === 'missions' && (
          <div className="card-list">
            {todaysMissions.map((def) => (
              <MissionCard
                key={def.id}
                def={def}
                progress={getMissionProgress(def)}
                totalEarned={state.totalEarned}
                completed={state.missions.completed.includes(def.id)}
              />
            ))}
          </div>
        )}
        {tab === 'prestige' && (
          <div className="prestige-tab">
            <p>プレステージポイント: {state.prestigePoints}</p>
            <p>総収入100万でプレステージ解放</p>
            {canPrestige() ? (
              <button
                type="button"
                className="btn-prestige"
                onClick={() => setShowPrestigeModal(true)}
              >
                プレステージ（+{getPrestigePreview()} pt）
              </button>
            ) : (
              <button type="button" className="btn-prestige" disabled>
                解放まで稼ごう
              </button>
            )}
          </div>
        )}
      </section>

      {showPrestigeModal && canPrestige() && (
        <PrestigeModal
          pointsGained={getPrestigePreview()}
          totalEarned={state.totalEarned}
          onClose={() => setShowPrestigeModal(false)}
        />
      )}

      <a href="/index.html" className="app-back">← トップへ戻る</a>

      {offlineData && (
        <OfflineModal
          earned={offlineData.earned}
          hours={offlineData.hours}
          onClose={() => setOfflineData(null)}
        />
      )}
    </div>
  );
}
