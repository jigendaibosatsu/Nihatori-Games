export type Rarity = 'N' | 'R' | 'SR' | 'SSR' | 'UR' | 'Mythic'

export interface SlimeDef {
  id: string
  name: string
  tier: number
  rarity: Rarity
  baseProduction: number
  nextId?: string
}

export interface SlimeInstance {
  id: string
  speciesId: string
  level: number
  rarity: Rarity
}

export interface FactorySlot {
  id: string
  slimeInstanceId: string | null
}

export interface EncyclopediaEntry {
  seen: boolean
  owned: boolean
}

export interface SaveData {
  version: number
  lastSavedAt: number
  lastActiveAt: number
  factory: {
    slots: FactorySlot[]
    unlockedSlots: number
  }
  slimes: {
    byInstanceId: Record<string, SlimeInstance>
  }
  encyclopedia: {
    species: Record<string, EncyclopediaEntry>
  }
  currencies: {
    soft: number
  }
  stats: {
    totalMerges: number
    totalMutations: number
  }
}

