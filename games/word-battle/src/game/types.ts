export type CefrLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'
export type PartOfSpeech = 'noun' | 'verb' | 'adj' | 'adv' | 'other'

export type CardType = 'WORD' | 'GRAMMAR' | 'PHRASE'
export type Rarity = 'C' | 'U' | 'R' | 'SR' | 'UR'

export interface VocabEntry {
  id: string
  head: string
  meaningJa: string
  pos: PartOfSpeech
  cefr: CefrLevel
  freqRank: number
  example: string
  phonetic?: string
  tags: string[]
  source: string
}

export type AbilityKey =
  | 'none'
  | 'swift_strike'
  | 'shield_up'
  | 'poison_touch'
  | 'stun_burst'
  | 'heal_small'
  | 'draw_one'

export interface AbilityDef {
  key: AbilityKey
  params: Record<string, number | string | boolean>
  rulesTextJa: string
}

export interface CardDef {
  cardId: string
  sourceId: string
  cardType: CardType
  rarity: Rarity
  energyCost: number
  stats?: { atk: number; hp: number } // WORD
  ability: AbilityDef
  nameJa: string
  subtitleJa?: string
  flavorJa: string
  artPrompt: string
}

export interface MasteryState {
  seen: number
  correct: number
  lastSeenAt: number
  battleUsed: number
  battleWins: number
}

export interface DeckState {
  name: string
  cards: string[] // cardId list
}

export interface PlayerState {
  gold: number
  exp: number
  level: number
  shards: number
  materials: { common: number; uncommon: number; rare: number }
  ownedCards: Record<string, number>
  mastery: Record<string, MasteryState> // vocabId -> mastery
}

export interface SaveDataV1 {
  saveVersion: 1
  lastSavedAt: number
  nonce: number
  player: PlayerState
  decks: Record<string, DeckState>
  activeDeckId: string
  settings: {
    reducedMotion: boolean
  }
}

export type SaveData = SaveDataV1

// -------- Battle --------
export type StatusKey = 'shield' | 'stun' | 'poison' | 'buffAtk'

export interface StatusEffect {
  key: StatusKey
  amount: number
  turns: number
}

export interface BattleUnit {
  cardId: string
  nameJa: string
  atk: number
  hp: number
  maxHp: number
  rarity: Rarity
  statuses: StatusEffect[]
}

export interface BattleSide {
  hp: number
  energy: number
  maxEnergy: number
  deck: string[]
  hand: string[]
  discard: string[]
  lanes: Array<BattleUnit | null> // 3 lanes
}

export interface BattleLogEntry {
  t: number
  textJa: string
}

export interface BattleState {
  id: string
  seed: number
  turn: number
  maxTurns: number
  phase: 'player' | 'enemy' | 'ended'
  player: BattleSide
  enemy: BattleSide
  lastActionAt: number
  log: BattleLogEntry[]
  result?: { winner: 'player' | 'enemy' | 'draw' }
}

export type BattleAction =
  | { type: 'PLAY_CARD'; side: 'player' | 'enemy'; cardId: string; lane: number }
  | { type: 'CAST_SPELL'; side: 'player' | 'enemy'; cardId: string; lane: number }
  | { type: 'END_TURN'; side: 'player' | 'enemy' }
