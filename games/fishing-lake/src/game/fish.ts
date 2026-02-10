export interface Fish {
  id: string
  name: string
  rarity: 'C' | 'U' | 'R' | 'SR'
  minSize: number
  maxSize: number
}

export const FISHES: Fish[] = [
  { id: 'small_fish', name: 'ちび魚', rarity: 'C', minSize: 8, maxSize: 15 },
  { id: 'river_trout', name: '川マス', rarity: 'C', minSize: 20, maxSize: 35 },
  { id: 'catfish', name: 'ナマズ', rarity: 'U', minSize: 30, maxSize: 60 },
  { id: 'koi', name: 'コイ', rarity: 'U', minSize: 25, maxSize: 55 },
  { id: 'eel', name: 'ウナギ', rarity: 'R', minSize: 40, maxSize: 80 },
  { id: 'golden_clay_fish', name: '黄金の粘土魚', rarity: 'SR', minSize: 50, maxSize: 120 },
]

function mulberry32(seed: number): () => number {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

export function rollFish(seed: number) {
  const rng = mulberry32(seed)
  const r = rng()
  let pool: Fish[]
  if (r < 0.6) pool = FISHES.filter((f) => f.rarity === 'C')
  else if (r < 0.9) pool = FISHES.filter((f) => f.rarity === 'U')
  else if (r < 0.98) pool = FISHES.filter((f) => f.rarity === 'R')
  else pool = FISHES.filter((f) => f.rarity === 'SR')

  const fish = pool[Math.floor(rng() * pool.length)]!
  const size = Math.round(fish.minSize + (fish.maxSize - fish.minSize) * rng())
  return { fish, size }
}

