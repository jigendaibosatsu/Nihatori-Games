import type { AbilityDef, CardDef, CefrLevel, PartOfSpeech, Rarity, VocabEntry } from './types'
import { clamp, clamp01, hashStringToUint32, mulberry32, pickOne } from './rng'
import { VOCAB_MAX_RANK } from '../data/vocab_v1'

export const GAME_VERSION = 'v1'

const TIER: Record<CefrLevel, number> = { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, C2: 6 }

function posAtkMult(pos: PartOfSpeech): number {
  switch (pos) {
    case 'verb':
      return 1.05
    case 'adv':
      return 1.0
    case 'noun':
      return 0.95
    case 'adj':
      return 0.9
    default:
      return 0.95
  }
}

function posHpMult(pos: PartOfSpeech): number {
  switch (pos) {
    case 'noun':
      return 1.08
    case 'adj':
      return 1.02
    case 'verb':
      return 0.95
    case 'adv':
      return 0.98
    default:
      return 1.0
  }
}

function rarityFromIndex(idx: number): Rarity {
  return (['C', 'U', 'R', 'SR', 'UR'] as const)[clamp(idx, 0, 4)]!
}

export function computeFreqScore(freqRank: number): number {
  // frequent -> 1.0, rare -> 0.0
  return clamp01(1 - Math.log(Math.max(1, freqRank)) / Math.log(VOCAB_MAX_RANK))
}

export function generateWordCard(entry: VocabEntry): CardDef {
  const seed = hashStringToUint32(`${GAME_VERSION}:${entry.id}`)
  const rng = mulberry32(seed)

  const tier = TIER[entry.cefr]
  const freqScore = computeFreqScore(entry.freqRank)

  // rarity expectation: harder + rarer words tend to be higher rarity
  const expected = (tier - 1) * 0.55 + (1 - freqScore) * 1.6 // ~0..(2.75+1.6)=4.35
  const roll = rng()
  let rarityIndex = clamp(Math.floor(expected), 0, 4)

  // small random shift, deterministic per word
  if (roll > 0.92) rarityIndex = clamp(rarityIndex + 1, 0, 4)
  if (roll < 0.12) rarityIndex = clamp(rarityIndex - 1, 0, 4)

  const rarity = rarityFromIndex(rarityIndex)

  const energyCost = clamp(1, 8, Math.round(1 + tier * 0.6 + rarityIndex * 0.8 - freqScore * 1.0))

  const base = 8 + tier * 3 + Math.round(freqScore * 6) + rarityIndex * 2
  const atk = Math.max(1, Math.round(base * posAtkMult(entry.pos)))
  const hp = Math.max(1, Math.round(base * posHpMult(entry.pos)))

  const ability = pickAbility(entry, rarityIndex, rng)
  const flavorJa = buildFlavor(entry, rarityIndex, rng)
  const artPrompt = buildArtPrompt(entry, rarityIndex)

  return {
    cardId: `c_${entry.id}_${GAME_VERSION}`,
    sourceId: entry.id,
    cardType: 'WORD',
    rarity,
    energyCost,
    stats: { atk, hp },
    ability,
    nameJa: entry.head,
    subtitleJa: `${entry.meaningJa}（${entry.cefr}/${entry.pos}）`,
    flavorJa,
    artPrompt,
  }
}

function pickAbility(entry: VocabEntry, rarityIndex: number, rng: () => number): AbilityDef {
  const tags = new Set(entry.tags)

  // baseline powers (kept modest for MVP)
  const atkUp = clamp(2 + rarityIndex, 2, 7)
  const shield = clamp(3 + rarityIndex * 2, 3, 11)
  const poison = clamp(1 + Math.floor(rarityIndex / 2), 1, 3)

  const options: AbilityDef[] = [{ key: 'none', params: {}, rulesTextJa: '（能力なし）' }]

  if (tags.has('movement')) {
    options.push({
      key: 'swift_strike',
      params: { bonusAtk: atkUp, turns: 1 },
      rulesTextJa: `登場時、このターン攻撃力+${atkUp}。`,
    })
  }
  if (tags.has('business') || tags.has('pressure') || tags.has('tactic')) {
    options.push({
      key: 'shield_up',
      params: { shield, turns: 2 },
      rulesTextJa: `登場時、自分にシールド+${shield}（2ターン）。`,
    })
  }
  if (tags.has('emotion') && tags.has('ang')) {
    options.push({
      key: 'stun_burst',
      params: { laneStun: 1 },
      rulesTextJa: '登場時、正面レーンの敵を1ターン気絶。',
    })
  }
  if (tags.has('emotion') && tags.has('sor')) {
    options.push({
      key: 'heal_small',
      params: { heal: 3 + rarityIndex },
      rulesTextJa: `登場時、自分を${3 + rarityIndex}回復。`,
    })
  }
  if (tags.has('growth') || tags.has('craft')) {
    if (rarityIndex >= 2) {
      options.push({
        key: 'draw_one',
        params: { count: 1 },
        rulesTextJa: '登場時、カードを1枚引く。',
      })
    }
  }
  if (tags.has('business') && rarityIndex >= 2) {
    options.push({
      key: 'poison_touch',
      params: { poison, turns: 3 },
      rulesTextJa: `登場時、正面レーンの敵に毒${poison}（3ターン）。`,
    })
  }

  // high rarity: reduce chance of "none"
  const weights = options.map((a) => {
    if (a.key === 'none') return rarityIndex >= 2 ? 0.15 : 0.55
    return 1
  })

  const total = weights.reduce((s, w) => s + w, 0)
  let r = rng() * total
  for (let i = 0; i < options.length; i++) {
    r -= weights[i]!
    if (r <= 0) return options[i]!
  }
  return options[0]!
}

function buildFlavor(entry: VocabEntry, rarityIndex: number, rng: () => number): string {
  const base = [
    `「${entry.head}」は、今日の勝ち筋。`,
    `たった1語で、戦況は変わる。`,
    `覚えた瞬間が、強さになる。`,
  ]
  const high = [
    `難しいほど、効果は尖る。`,
    `この1枚で流れを奪え。`,
  ]
  const list = rarityIndex >= 3 ? base.concat(high) : base
  return pickOne(rng, list)
}

function buildArtPrompt(entry: VocabEntry, rarityIndex: number): string {
  const tone = rarityIndex >= 3 ? 'high detail, cinematic lighting' : 'minimal trading card art'
  const tag = entry.tags[0] ?? 'abstract symbol'
  return `${tone}, ${tag} motif, clean shapes, no text`
}

