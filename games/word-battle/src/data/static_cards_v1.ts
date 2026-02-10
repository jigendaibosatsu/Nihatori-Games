import type { CardDef } from '../game/types'

// Grammar/Phrase cards are not generated from vocab in MVP.
// Keep ids stable for future migrations.
export const STATIC_CARDS_V1: CardDef[] = [
  {
    cardId: 'g_present_perfect_v1',
    sourceId: 'grammar_present_perfect',
    cardType: 'GRAMMAR',
    rarity: 'U',
    energyCost: 2,
    ability: {
      key: 'draw_one',
      params: { count: 1 },
      rulesTextJa: 'カードを1枚引く。',
    },
    nameJa: '現在完了',
    subtitleJa: 'Present Perfect',
    flavorJa: '過去と今がつながる。',
    artPrompt: 'minimal trading card art, clock and timeline, purple glow',
  },
  {
    cardId: 'g_passive_voice_v1',
    sourceId: 'grammar_passive_voice',
    cardType: 'GRAMMAR',
    rarity: 'R',
    energyCost: 3,
    ability: {
      key: 'shield_up',
      params: { shield: 6, turns: 2 },
      rulesTextJa: '味方全体にシールド+6（2ターン）。',
    },
    nameJa: '受動態',
    subtitleJa: 'Passive Voice',
    flavorJa: '主語は守られる。',
    artPrompt: 'minimal trading card art, protective barrier, calm blue',
  },
  {
    cardId: 'p_take_off_v1',
    sourceId: 'phrase_take_off',
    cardType: 'PHRASE',
    rarity: 'U',
    energyCost: 2,
    ability: {
      key: 'swift_strike',
      params: { bonusAtk: 3, turns: 1 },
      rulesTextJa: 'このターン、味方1体の攻撃力+3。',
    },
    nameJa: 'take off',
    subtitleJa: '離陸する/脱ぐ/急に成功する',
    flavorJa: '一気に加速する。',
    artPrompt: 'minimal trading card art, airplane silhouette, speed lines',
  },
  {
    cardId: 'p_break_down_v1',
    sourceId: 'phrase_break_down',
    cardType: 'PHRASE',
    rarity: 'R',
    energyCost: 3,
    ability: {
      key: 'poison_touch',
      params: { poison: 2, turns: 3 },
      rulesTextJa: '敵1レーンに毒2（3ターン）。',
    },
    nameJa: 'break down',
    subtitleJa: '故障する/分解する',
    flavorJa: 'だんだん崩れていく。',
    artPrompt: 'minimal trading card art, cracked machine, warning yellow',
  },
]

