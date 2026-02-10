import type { Rarity, SlimeDef } from './types'

export const SLIMES: SlimeDef[] = [
  {
    id: 'slime_basic_01',
    name: 'ぷるぷるスライム',
    tier: 1,
    rarity: 'N',
    baseProduction: 1,
    nextId: 'slime_basic_02',
  },
  {
    id: 'slime_basic_02',
    name: 'もりもりスライム',
    tier: 2,
    rarity: 'N',
    baseProduction: 3,
    nextId: 'slime_basic_03',
  },
  {
    id: 'slime_basic_03',
    name: 'ゴロゴロスライム',
    tier: 3,
    rarity: 'R',
    baseProduction: 8,
    nextId: 'slime_basic_04',
  },
  {
    id: 'slime_basic_04',
    name: 'しっとりスライム',
    tier: 4,
    rarity: 'R',
    baseProduction: 20,
  },
]

const byId: Record<string, SlimeDef> = Object.fromEntries(SLIMES.map((s) => [s.id, s]))

export function getSlimeDef(id: string): SlimeDef {
  const def = byId[id]
  if (!def) throw new Error(`Unknown slime species: ${id}`)
  return def
}

export function rarityFromTier(tier: number): Rarity {
  if (tier <= 2) return 'N'
  if (tier === 3) return 'R'
  if (tier === 4) return 'SR'
  if (tier === 5) return 'SSR'
  if (tier === 6) return 'UR'
  return 'Mythic'
}

