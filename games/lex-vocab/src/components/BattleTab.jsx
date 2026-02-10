import { useState, useMemo, useEffect } from 'react';
import { getState, consumeEnergy, addVocabXp, setStreak, incrementCurse, unlockFarm } from '../store/store';
import { vocabToCard } from '../utils/card';
import { xpToLevel } from '../utils/vocab';

// Quiz tags (連想) - simple A/B for MVP
const QUIZ_PAIRS = [
  { term: 'ability', a: 'skill', b: 'food', correct: 'a' },
  { term: 'action', a: 'movement', b: 'color', correct: 'a' },
  { term: 'animal', a: 'creature', b: 'machine', correct: 'a' },
  { term: 'beautiful', a: 'pretty', b: 'ugly', correct: 'a' },
  { term: 'build', a: 'construct', b: 'destroy', correct: 'a' },
  { term: 'child', a: 'kid', b: 'adult', correct: 'a' },
  { term: 'danger', a: 'risk', b: 'safety', correct: 'a' },
  { term: 'energy', a: 'power', b: 'sleep', correct: 'a' },
  { term: 'friend', a: 'buddy', b: 'enemy', correct: 'a' },
  { term: 'happy', a: 'joyful', b: 'sad', correct: 'a' },
  { term: 'knowledge', a: 'understanding', b: 'ignorance', correct: 'a' },
  { term: 'music', a: 'sound', b: 'silence', correct: 'a' },
  { term: 'problem', a: 'issue', b: 'solution', correct: 'a' },
  { term: 'strong', a: 'powerful', b: 'weak', correct: 'a' },
  { term: 'think', a: 'consider', b: 'ignore', correct: 'a' },
  { term: 'water', a: 'liquid', b: 'fire', correct: 'a' },
  { term: 'work', a: 'labor', b: 'rest', correct: 'a' },
];

function getQuizForTerm(term) {
  const t = (term || '').toLowerCase();
  const found = QUIZ_PAIRS.find((q) => q.term === t);
  if (found) return found;
  return {
    term: t,
    a: 'related',
    b: 'unrelated',
    correct: Math.random() < 0.5 ? 'a' : 'b',
  };
}

export default function BattleTab({ onNavigateToTimer }) {
  const state = getState();
  const [inBattle, setInBattle] = useState(false);
  const [playerHp, setPlayerHp] = useState(20);
  const [enemyHp, setEnemyHp] = useState(20);
  const [enemyDef, setEnemyDef] = useState(3);
  const [hand, setHand] = useState([]);
  const [deck, setDeck] = useState([]);
  const [quiz, setQuiz] = useState(null);
  const [pendingCard, setPendingCard] = useState(null);
  const [battleLog, setBattleLog] = useState('');
  const [energyBlocked, setEnergyBlocked] = useState(false);

  const deckCards = useMemo(() => {
    const vocabs = [...state.vocabs]
      .sort((a, b) => xpToLevel(b.xp) - xpToLevel(a.xp))
      .slice(0, 10);
    return vocabs.map(vocabToCard);
  }, [state.vocabs]);

  const startBattle = () => {
    if (state.player.energy <= 0) {
      setEnergyBlocked(true);
      return;
    }
    consumeEnergy();
    const d = [...deckCards];
    const h = d.splice(0, 3);
    setDeck(d);
    setHand(h);
    setPlayerHp(20);
    setEnemyHp(20);
    setEnemyDef(3);
    setInBattle(true);
    setBattleLog('Battle start!');
    setEnergyBlocked(false);
  };

  const applyCard = (card, correct) => {
    const mult = correct ? 1 : 0.5;
    const dmg = Math.max(0, Math.floor((card.attack - enemyDef) * mult));
    setEnemyHp((h) => Math.max(0, h - dmg));
    addVocabXp(card.vocabId, correct ? 2 : 1);
    if (correct) setStreak(getState().player.streak + 1);
    else {
      setStreak(0);
      incrementCurse();
    }
    setBattleLog(
      correct
        ? `${card.term} hit for ${dmg}! (xp +2)`
        : `${card.term} weak hit ${dmg}. (xp +1)`
    );
  };

  const playCard = (card) => {
    const q = getQuizForTerm(card.term);
    setQuiz(q);
    setPendingCard(card);
  };

  const answerQuiz = (choice) => {
    const correct = quiz.correct === choice;
    if (pendingCard) {
      applyCard(pendingCard, correct);
      setHand((h) => h.filter((c) => c.vocabId !== pendingCard.vocabId));
      if (deck.length > 0) {
        const next = deck[0];
        setDeck((d) => d.slice(1));
        setHand((h) => [...h, next]);
      }
    }
    setQuiz(null);
    setPendingCard(null);
  };

  useEffect(() => {
    if (inBattle && enemyHp <= 0) {
      setInBattle(false);
      unlockFarm();
    }
  }, [inBattle, enemyHp]);

  const energy = getState().player.energy;

  if (energy <= 0 && !inBattle) {
    return (
      <div className="battle-tab">
        <h2>OXWORD BATTLE</h2>
        <div className="battle-energy-block">
          No energy. Complete a timer session to restore energy.
        </div>
        <button type="button" onClick={onNavigateToTimer}>
          Go to Timer tab
        </button>
      </div>
    );
  }

  if (!inBattle && !energyBlocked) {
    const canBattle = deckCards.length >= 3;
    return (
      <div className="battle-tab">
        <h2>OXWORD BATTLE</h2>
        <div className="battle-hud">Energy: {energy}</div>
        {!canBattle && (
          <div className="battle-energy-block">
            Need at least 3 vocab words. Complete timer sessions first.
          </div>
        )}
        <button type="button" onClick={startBattle} disabled={!canBattle}>
          Start Battle (-1 energy)
        </button>
      </div>
    );
  }

  if (energyBlocked) {
    return (
      <div className="battle-tab">
        <h2>OXWORD BATTLE</h2>
        <div className="battle-energy-block">No energy. Complete a timer session.</div>
        <button type="button" onClick={() => setEnergyBlocked(false)}>
          Back
        </button>
      </div>
    );
  }

  return (
    <div className="battle-tab">
      <h2>OXWORD BATTLE</h2>
      <div className="battle-hud">
        <span>HP: {playerHp}/20</span>
        <span>Enemy: {enemyHp}/20</span>
      </div>
      <div className="battle-log">{battleLog}</div>

      {quiz ? (
        <div className="battle-quiz">
          <p>What relates to &quot;{quiz.term}&quot;?</p>
          <button type="button" onClick={() => answerQuiz('a')}>
            {quiz.a}
          </button>
          <button type="button" onClick={() => answerQuiz('b')}>
            {quiz.b}
          </button>
        </div>
      ) : (
        <div className="battle-hand">
          {hand.map((c) => (
            <button
              key={c.vocabId}
              type="button"
              className="battle-card"
              onClick={() => playCard(c)}
            >
              <div className="card-term">{c.term}</div>
              <div className="card-stats">
                ATK{c.attack} DEF{c.defense} Cost{c.cost}
              </div>
              {c.skill && <div className="card-skill">{c.skill}</div>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
