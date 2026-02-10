import { useState, useEffect, useCallback } from 'react';
import { getState, completeTimerSession, unlockFarm } from '../store/store';
import { xpToLevel } from '../utils/vocab';

const WORK_SEC = 25 * 60;
const BREAK_SEC = 5 * 60;

export default function TimerTab() {
  const [seconds, setSeconds] = useState(WORK_SEC);
  const [isBreak, setIsBreak] = useState(false);
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState('');
  const [state, setState] = useState(getState);

  const refresh = useCallback(() => setState(getState()), []);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          setRunning(false);
          const { added, isBreak: wasBreak } = completeTimerSession(isBreak);
          if (wasBreak) {
            setLog(`Break complete. +${added} word${added > 1 ? 's' : ''}.`);
          } else {
            setLog(`Session complete. +${added} words. Energy restored.`);
          }
          refresh();
          return wasBreak ? WORK_SEC : BREAK_SEC;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running, isBreak, refresh]);

  const startWork = () => {
    setIsBreak(false);
    setSeconds(WORK_SEC);
    setRunning(true);
    setLog('');
  };

  const startBreak = () => {
    setIsBreak(true);
    setSeconds(BREAK_SEC);
    setRunning(true);
    setLog('');
  };

  const vocabCount = state.vocabs.length;
  const totalCount = state.sessionCountToday;
  const progress = Math.min(50, vocabCount);
  const farmUnlocked = vocabCount >= 50;

  useEffect(() => {
    if (farmUnlocked) unlockFarm();
  }, [farmUnlocked]);

  return (
    <div className="timer-tab">
      <h2>LEX RHYTHM</h2>
      <div className="timer-hud">
        <div>Energy: {state.player.energy}</div>
        <div>Vocab: {vocabCount}</div>
        <div>Sessions today: {totalCount}</div>
      </div>

      <div className="timer-display">
        <span className="timer-time">
          {Math.floor(seconds / 60)}:{(seconds % 60).toString().padStart(2, '0')}
        </span>
        <div className="timer-mode">{isBreak ? 'Break' : 'Work'}</div>
      </div>

      <div className="timer-progress">
        <div className="progress-label">Next unlock: {progress}/50</div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${(progress / 50) * 100}%` }} />
        </div>
      </div>

      {!running && (
        <div className="timer-buttons">
          <button type="button" onClick={startWork}>
            Start 25 min
          </button>
          <button type="button" onClick={startBreak}>
            Start 5 min break
          </button>
        </div>
      )}

      {log && <div className="timer-log">{log}</div>}

      {farmUnlocked && (
        <div className="timer-unlock">Farm unlocked.</div>
      )}

      <div className="timer-recent">
        <div className="recent-label">Latest words</div>
        <ul>
          {state.vocabs
            .slice()
            .reverse()
            .slice(0, 8)
            .map((v) => (
              <li key={v.id}>
                {v.term} (Lv{xpToLevel(v.xp)})
              </li>
            ))}
        </ul>
      </div>
    </div>
  );
}
