import { useState } from 'react';
import TimerTab from './components/TimerTab';
import BattleTab from './components/BattleTab';
import { getState } from './store/store';
import './App.css';

export default function App() {
  const [tab, setTab] = useState('timer');
  const state = getState();
  const farmUnlocked = state.vocabs.length >= 50;
  const hasFarm = state.player.unlocks?.includes('farm');

  return (
    <div className={`app ${farmUnlocked && hasFarm ? 'farm-unlocked' : ''}`}>
      <header className="app-header">
        <h1>Lex Vocab</h1>
        <nav>
          <button
            type="button"
            className={tab === 'timer' ? 'active' : ''}
            onClick={() => setTab('timer')}
          >
            Timer
          </button>
          <button
            type="button"
            className={tab === 'battle' ? 'active' : ''}
            onClick={() => setTab('battle')}
          >
            Battle
          </button>
        </nav>
      </header>
      <main className="app-main">
        {tab === 'timer' && <TimerTab />}
        {tab === 'battle' && <BattleTab onNavigateToTimer={() => setTab('timer')} />}
      </main>
    </div>
  );
}
