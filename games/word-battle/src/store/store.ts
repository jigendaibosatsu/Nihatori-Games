import type { BattleState, CardDef, MasteryState, SaveData, SaveDataV1 } from '../game/types'
import { hashStringToUint32, mulberry32 } from '../game/rng'
import { makeQuizQuestion, type QuizQuestion } from '../game/quiz'
import { buildCardDatabase, openLearningPack } from '../game/packs'
import { VOCAB_V1 } from '../data/vocab_v1'
import { createBattle, endTurn, playCard } from '../game/battle/engine'
import { runEnemyTurn } from '../game/battle/ai'

const STORAGE_KEY = 'nihatori_word_battle_save'

export type TabId = 'quiz' | 'deck' | 'battle' | 'worddex' | 'shop'

export interface PendingPack {
  seed: number
  from: 'quiz'
}

export interface AppState {
  save: SaveData
  tab: TabId
  quiz: {
    question: QuizQuestion
    answered?: { choiceId: string; correct: boolean }
    lastAnsweredAt?: number
  }
  pendingPack?: PendingPack
  lastPackResults?: { cards: CardDef[]; doubled: boolean }
  battle?: BattleState
}

type Listener = () => void

export const db = buildCardDatabase(VOCAB_V1)

function defaultSave(): SaveDataV1 {
  const starter = openLearningPack({
    db,
    owned: {},
    seed: hashStringToUint32('starter'),
  }).cardId

  const owned: Record<string, number> = { [starter]: 1 }
  const deckId = 'deck1'

  return {
    saveVersion: 1,
    lastSavedAt: Date.now(),
    nonce: 1,
    player: {
      gold: 100,
      exp: 0,
      level: 1,
      shards: 0,
      materials: { common: 0, uncommon: 0, rare: 0 },
      ownedCards: owned,
      mastery: {},
    },
    decks: {
      [deckId]: { name: 'はじめてのデッキ', cards: [starter] },
    },
    activeDeckId: deckId,
    settings: { reducedMotion: false },
  }
}

function sanitizeSave(raw: unknown): SaveData {
  if (!raw || typeof raw !== 'object') return defaultSave()
  const s = raw as Partial<SaveDataV1>
  if (s.saveVersion !== 1) return defaultSave()
  if (!s.player || !s.decks || !s.activeDeckId) return defaultSave()
  return {
    saveVersion: 1,
    lastSavedAt: typeof s.lastSavedAt === 'number' ? s.lastSavedAt : Date.now(),
    nonce: typeof s.nonce === 'number' ? s.nonce : 1,
    player: {
      gold: clampNum(s.player.gold, 0, 9999999, 100),
      exp: clampNum(s.player.exp, 0, 9999999, 0),
      level: clampNum(s.player.level, 1, 9999, 1),
      shards: clampNum(s.player.shards, 0, 9999999, 0),
      materials: s.player.materials ?? { common: 0, uncommon: 0, rare: 0 },
      ownedCards: s.player.ownedCards ?? {},
      mastery: s.player.mastery ?? {},
    },
    decks: s.decks,
    activeDeckId: s.activeDeckId,
    settings: s.settings ?? { reducedMotion: false },
  }
}

function clampNum(n: unknown, min: number, max: number, fallback: number): number {
  if (typeof n !== 'number' || Number.isNaN(n)) return fallback
  return Math.max(min, Math.min(max, n))
}

function getMastery(save: SaveData, vocabId: string): MasteryState {
  return (
    save.player.mastery[vocabId] ?? {
      seen: 0,
      correct: 0,
      lastSeenAt: 0,
      battleUsed: 0,
      battleWins: 0,
    }
  )
}

function applyLevelUps(save: SaveData): void {
  // MVP: simple linear leveling
  const needPerLevel = 100
  while (save.player.exp >= save.player.level * needPerLevel) {
    save.player.level += 1
    save.player.gold += 50
  }
}

let state: AppState = {
  save: defaultSave(),
  tab: 'quiz',
  quiz: { question: makeQuizQuestion(VOCAB_V1, hashStringToUint32('q0')) },
}

const listeners: Listener[] = []

export function getState(): AppState {
  return state
}

export function subscribe(fn: Listener): () => void {
  listeners.push(fn)
  return () => {
    const i = listeners.indexOf(fn)
    if (i >= 0) listeners.splice(i, 1)
  }
}

function emit(): void {
  for (const l of listeners) l()
}

export function setState(updater: (prev: AppState) => AppState): void {
  state = updater(state)
  emit()
}

export function saveToStorage(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.save))
  } catch {
    // ignore
  }
}

export function initStore(): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      const loaded = sanitizeSave(parsed)
      state = {
        ...state,
        save: loaded,
      }
    }
  } catch {
    // ignore
  }

  // refresh quiz seed from nonce
  state.quiz.question = makeQuizQuestion(VOCAB_V1, hashStringToUint32(`q:${state.save.nonce}`))
  emit()

  // autosave
  window.setInterval(saveToStorage, 10_000)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') saveToStorage()
  })
}

export function answerQuiz(choiceId: string): void {
  setState((prev) => {
    const q = prev.quiz.question
    const choice = q.choices.find((c) => c.id === choiceId)
    if (!choice) return prev

    const correct = choice.isCorrect
    const save = structuredClone(prev.save) as SaveData
    const ms = getMastery(save, q.vocabId)
    ms.seen += 1
    if (correct) ms.correct += 1
    ms.lastSeenAt = Date.now()
    save.player.mastery[q.vocabId] = ms

    if (correct) {
      save.player.gold += 10
      save.player.exp += 5
      save.player.shards += 1
    }
    applyLevelUps(save)

    // advance nonce and prepare next question
    save.nonce += 1
    const nextQ = makeQuizQuestion(VOCAB_V1, hashStringToUint32(`q:${save.nonce}`))

    const pendingPack: PendingPack | undefined = correct
      ? {
          seed: hashStringToUint32(`pack:${save.nonce}:${Date.now()}`) >>> 0,
          from: 'quiz',
        }
      : undefined

    return {
      ...prev,
      save,
      quiz: { question: nextQ, answered: { choiceId, correct }, lastAnsweredAt: Date.now() },
      pendingPack,
    }
  })
}

export function claimPendingPack(params: { doubled: boolean }): void {
  setState((prev) => {
    if (!prev.pendingPack) return prev
    const save = structuredClone(prev.save) as SaveData

    const results: CardDef[] = []
    const base = openLearningPack({ db, owned: save.player.ownedCards, seed: prev.pendingPack.seed })
    results.push(db.byId[base.cardId]!)

    if (params.doubled) {
      const extra = openLearningPack({ db, owned: save.player.ownedCards, seed: (prev.pendingPack.seed + 1) >>> 0 })
      results.push(db.byId[extra.cardId]!)
    }

    for (const c of results) {
      save.player.ownedCards[c.cardId] = (save.player.ownedCards[c.cardId] ?? 0) + 1
    }

    return {
      ...prev,
      save,
      pendingPack: undefined,
      lastPackResults: { cards: results, doubled: params.doubled },
    }
  })
}

export async function watchAdStub(): Promise<boolean> {
  // MVP: always succeeds
  await new Promise((r) => setTimeout(r, 450))
  return true
}

export function setTab(tab: TabId): void {
  setState((prev) => ({ ...prev, tab }))
}

export function activeDeck(state: AppState): string[] {
  return state.save.decks[state.save.activeDeckId]?.cards ?? []
}

export function addToDeck(cardId: string): void {
  setState((prev) => {
    const save = structuredClone(prev.save) as SaveData
    const deck = save.decks[save.activeDeckId]
    if (!deck) return prev
    if (deck.cards.length >= 20) return prev
    const owned = save.player.ownedCards[cardId] ?? 0
    const inDeck = deck.cards.filter((c) => c === cardId).length
    if (inDeck >= owned) return prev
    deck.cards.push(cardId)
    return { ...prev, save }
  })
}

export function removeFromDeck(index: number): void {
  setState((prev) => {
    const save = structuredClone(prev.save) as SaveData
    const deck = save.decks[save.activeDeckId]
    if (!deck) return prev
    if (index < 0 || index >= deck.cards.length) return prev
    deck.cards.splice(index, 1)
    return { ...prev, save }
  })
}

export function autoBuildDeck(): void {
  setState((prev) => {
    const save = structuredClone(prev.save) as SaveData
    const deck = save.decks[save.activeDeckId]
    if (!deck) return prev
    const ownedIds = Object.keys(save.player.ownedCards).filter((id) => (save.player.ownedCards[id] ?? 0) > 0)
    const scored = ownedIds
      .map((id) => db.byId[id])
      .filter((c): c is CardDef => !!c)
      .sort((a, b) => (b.stats?.atk ?? 0) + (b.stats?.hp ?? 0) - ((a.stats?.atk ?? 0) + (a.stats?.hp ?? 0)))

    const out: string[] = []
    for (const card of scored) {
      const max = save.player.ownedCards[card.cardId] ?? 0
      const take = Math.min(max, 2) // MVP: limit duplicates to keep variety
      for (let i = 0; i < take; i++) {
        if (out.length >= 20) break
        out.push(card.cardId)
      }
      if (out.length >= 20) break
    }
    deck.cards = out
    return { ...prev, save }
  })
}

function makeEnemyDeck(save: SaveData): string[] {
  // MVP: mirror-ish deck from your owned cards (keeps battles fair)
  const ownedIds = Object.keys(save.player.ownedCards).filter((id) => (save.player.ownedCards[id] ?? 0) > 0)
  const pool = ownedIds.length > 0 ? ownedIds : Object.keys(db.byId)
  const seed = hashStringToUint32(`enemy:${save.nonce}:${Date.now()}`)
  const rng = mulberry32(seed)
  const out: string[] = []
  while (out.length < 20 && pool.length > 0) {
    const pick = pool[Math.floor(rng() * pool.length)]!
    out.push(pick)
  }
  return out
}

export function startBattle(): void {
  setState((prev) => {
    const deck = activeDeck(prev)
    if (deck.length < 10) return { ...prev, tab: 'deck' }
    const save = structuredClone(prev.save) as SaveData
    const seed = hashStringToUint32(`battle:${save.nonce}:${Date.now()}`)
    const enemyDeck = makeEnemyDeck(save)
    const battle = createBattle({ db, playerDeck: deck, enemyDeck, seed })
    return { ...prev, save, battle, tab: 'battle' }
  })
}

export function battlePlay(cardId: string, lane: number): void {
  setState((prev) => {
    if (!prev.battle || prev.battle.phase !== 'player') return prev
    const battle = structuredClone(prev.battle) as BattleState
    playCard({ state: battle, side: 'player', cardId, lane, db })
    return { ...prev, battle }
  })
}

export function battleEndTurn(): void {
  setState((prev) => {
    if (!prev.battle || prev.battle.phase !== 'player') return prev
    const battle = structuredClone(prev.battle) as BattleState
    endTurn({ state: battle, side: 'player' })
    if (battle.phase === 'enemy') {
      runEnemyTurn({ state: battle, db })
      endTurn({ state: battle, side: 'enemy' })
    }
    return { ...prev, battle }
  })
}

export function closeBattle(): void {
  setState((prev) => {
    if (!prev.battle) return prev
    const save = structuredClone(prev.save) as SaveData
    const res = prev.battle.result?.winner

    // WordDex battle stats: count WORD cards actually used (discarded = played)
    const usedCardIds = prev.battle.player.discard
    const usedVocabIds = usedCardIds
      .map((id) => db.byId[id])
      .filter((c): c is CardDef => !!c && c.cardType === 'WORD')
      .map((c) => c.sourceId)

    for (const vocabId of usedVocabIds) {
      const m = getMastery(save, vocabId)
      m.battleUsed += 1
      if (res === 'player') m.battleWins += 1
      save.player.mastery[vocabId] = m
    }

    if (res === 'player') {
      save.player.gold += 40
      save.player.exp += 15
    } else if (res === 'enemy') {
      save.player.gold += 15
      save.player.exp += 5
    } else if (res === 'draw') {
      save.player.gold += 25
      save.player.exp += 8
    }
    applyLevelUps(save)
    return { ...prev, save, battle: undefined, tab: 'quiz' }
  })
}

