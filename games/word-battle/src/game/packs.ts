import type { CardDef, CardType, Rarity, VocabEntry } from './types'
import { generateWordCard } from './cardGen'
import { clamp, mulberry32, pickOne } from './rng'
import { STATIC_CARDS_V1 } from '../data/static_cards_v1'

export interface CardDatabase {
  all: CardDef[]
  byId: Record<string, CardDef>
  wordCardIdsByRarity: Record<Rarity, string[]>
  staticCardIdsByType: Record<CardType, string[]>
}

export function buildCardDatabase(vocab: VocabEntry[]): CardDatabase {
  const wordCards = vocab.map(generateWordCard)
  const all = [...wordCards, ...STATIC_CARDS_V1]
  const byId: Record<string, CardDef> = {}
  for (const c of all) byId[c.cardId] = c

  const wordCardIdsByRarity: CardDatabase['wordCardIdsByRarity'] = {
    C: [],
    U: [],
    R: [],
    SR: [],
    UR: [],
  }
  for (const c of wordCards) wordCardIdsByRarity[c.rarity].push(c.cardId)

  const staticCardIdsByType: CardDatabase['staticCardIdsByType'] = {
    WORD: [],
    GRAMMAR: [],
    PHRASE: [],
  }
  for (const c of STATIC_CARDS_V1) staticCardIdsByType[c.cardType].push(c.cardId)

  return { all, byId, wordCardIdsByRarity, staticCardIdsByType }
}

export const PACK_RATES: Array<{ rarity: Rarity; p: number }> = [
  { rarity: 'C', p: 0.7 },
  { rarity: 'U', p: 0.22 },
  { rarity: 'R', p: 0.07 },
  { rarity: 'SR', p: 0.009 },
  { rarity: 'UR', p: 0.001 },
]

export function rollRarity(rng: () => number): Rarity {
  const r = rng()
  let acc = 0
  for (const it of PACK_RATES) {
    acc += it.p
    if (r <= acc) return it.rarity
  }
  return 'C'
}

function preferUnowned(
  rng: () => number,
  candidates: string[],
  owned: Record<string, number>,
  unownedChance: number,
): string {
  if (candidates.length === 0) throw new Error('empty candidates')
  const unowned = candidates.filter((id) => (owned[id] ?? 0) <= 0)
  if (unowned.length > 0 && rng() < unownedChance) return pickOne(rng, unowned)
  return pickOne(rng, candidates)
}

function fallbackRarityOrder(r: Rarity): Rarity[] {
  const order: Rarity[] = ['C', 'U', 'R', 'SR', 'UR']
  const idx = order.indexOf(r)
  const out: Rarity[] = []
  for (let i = 0; i < order.length; i++) out.push(order[clamp(idx + i, 0, order.length - 1)]!)
  for (let i = 1; i <= idx; i++) out.push(order[idx - i]!)
  return Array.from(new Set(out))
}

export function openLearningPack(params: {
  db: CardDatabase
  owned: Record<string, number>
  seed: number
}): { cardId: string; rarity: Rarity } {
  const rng = mulberry32(params.seed)

  // Mostly WORD, sometimes PHRASE/GRAMMAR as spice.
  const typeRoll = rng()
  const type: CardType = typeRoll < 0.85 ? 'WORD' : typeRoll < 0.95 ? 'PHRASE' : 'GRAMMAR'

  const desired = rollRarity(rng)

  if (type === 'WORD') {
    const order = fallbackRarityOrder(desired)
    for (const rr of order) {
      const ids = params.db.wordCardIdsByRarity[rr]
      if (ids.length === 0) continue
      const cardId = preferUnowned(rng, ids, params.owned, 0.7)
      return { cardId, rarity: params.db.byId[cardId]!.rarity }
    }
  } else {
    const candidates = params.db.staticCardIdsByType[type]
    if (candidates.length > 0) {
      const cardId = preferUnowned(rng, candidates, params.owned, 0.6)
      return { cardId, rarity: params.db.byId[cardId]!.rarity }
    }
  }

  // absolute fallback
  const any = params.db.all.map((c) => c.cardId)
  const cardId = preferUnowned(rng, any, params.owned, 0.7)
  return { cardId, rarity: params.db.byId[cardId]!.rarity }
}

