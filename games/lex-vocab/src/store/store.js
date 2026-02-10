import { WORD_LIST } from '../data/words';
import { generateId, normalizeTerm, xpToLevel, assignRarity } from '../utils/vocab';

const STORAGE_KEY = 'lex_vocab_save';

const defaultPlayer = () => ({
  energy: 3,
  coins: 0,
  streak: 0,
  unlocks: [],
  lastSessionAt: null,
  curseCount: 0,
});

const defaultState = () => ({
  vocabs: [],
  player: defaultPlayer(),
  sessionCountToday: 0,
  lastSessionDate: null,
  consecutiveSessions: 0,
});

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    return {
      ...defaultState(),
      ...parsed,
      vocabs: parsed.vocabs ?? [],
      player: { ...defaultPlayer(), ...parsed.player },
    };
  } catch {
    return defaultState();
  }
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      vocabs: state.vocabs,
      player: state.player,
      sessionCountToday: state.sessionCountToday,
      lastSessionDate: state.lastSessionDate,
      consecutiveSessions: state.consecutiveSessions,
    }));
  } catch (e) {
    console.error('Save failed', e);
  }
}

export function getState() {
  if (!window.__lexState) window.__lexState = loadState();
  return window.__lexState;
}

export function setState(updater) {
  const s = getState();
  const next = typeof updater === 'function' ? updater(s) : { ...s, ...updater };
  window.__lexState = next;
  saveState(next);
  return next;
}

export function getExistingTerms() {
  return new Set(getState().vocabs.map((v) => normalizeTerm(v.term)));
}

export function addVocabFromTimer(count = 3, bonus = 0) {
  const existing = getExistingTerms();
  const pool = WORD_LIST.filter((w) => !existing.has(normalizeTerm(w)));
  const toAdd = Math.min(count + bonus, pool.length);

  const now = Date.now();
  const vocabs = [];

  for (let i = 0; i < toAdd; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    const term = pool[idx];
    pool.splice(idx, 1);
    const norm = normalizeTerm(term);
    existing.add(norm);
    vocabs.push({
      id: generateId(),
      term: norm,
      createdAt: now,
      source: 'timer',
      xp: 1,
      rarity: assignRarity(1),
      tags: [],
      cooldownUntil: null,
    });
  }

  setState((s) => ({
    vocabs: [...s.vocabs, ...vocabs],
  }));

  return vocabs.length;
}

export function completeTimerSession(isBreak = false) {
  const today = new Date().toDateString();
  let added = 0;

  if (isBreak) {
    added = addVocabFromTimer(1);
    setState((s) => {
      const consecutive = s.lastSessionDate !== today ? 1 : s.consecutiveSessions + 1;
      return {
        ...s,
        lastSessionDate: today,
        consecutiveSessions: consecutive,
      };
    });
    return { added, isBreak };
  }

  const s0 = getState();
  const hadSessionToday = s0.lastSessionDate === today && s0.sessionCountToday >= 1;
  added = addVocabFromTimer(3, hadSessionToday ? 5 : 0);

  setState((s) => {
    const consecutive = s.lastSessionDate !== today ? 1 : s.consecutiveSessions + 1;
    let energy = s.player.energy + 1;
    if (hadSessionToday) energy += 1;
    return {
      ...s,
      player: {
        ...s.player,
        energy,
        coins: s.player.coins + 1,
        lastSessionAt: Date.now(),
      },
      sessionCountToday: s.lastSessionDate === today ? s.sessionCountToday + 1 : 1,
      lastSessionDate: today,
      consecutiveSessions: consecutive,
    };
  });

  return { added, isBreak };
}

export function consumeEnergy() {
  const s = getState();
  if (s.player.energy <= 0) return false;
  setState((st) => ({
    ...st,
    player: { ...st.player, energy: st.player.energy - 1 },
  }));
  return true;
}

export function addVocabXp(vocabId, amount) {
  setState((s) => ({
    vocabs: s.vocabs.map((v) =>
      v.id === vocabId ? { ...v, xp: (v.xp ?? 0) + amount } : v
    ),
  }));
}

export function unlockFarm() {
  const s = getState();
  if (s.player.unlocks.includes('farm')) return;
  setState((st) => ({
    ...st,
    player: {
      ...st.player,
      unlocks: [...st.player.unlocks, 'farm'],
    },
  }));
}

export function setStreak(value) {
  setState((s) => ({
    player: { ...s.player, streak: value },
  }));
}

export function incrementCurse() {
  setState((s) => ({
    player: { ...s.player, curseCount: (s.player.curseCount ?? 0) + 1 },
  }));
}
