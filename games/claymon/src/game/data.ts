import type { Move, Species } from './types'

export const SPECIES: Species[] = [
  { id: 'clayling', name: 'クレイリング', types: ['CLAY'], baseHp: 20, baseAtk: 6 },
  { id: 'potteron', name: 'ポッテロン', types: ['CLAY', 'ARTIFACT'], baseHp: 28, baseAtk: 7 },
  { id: 'magclay', name: 'マグクレイ', types: ['CLAY', 'METAL'], baseHp: 24, baseAtk: 8 },
  { id: 'claydrake', name: 'クレイドレイク', types: ['CLAY', 'DRAGON'], baseHp: 26, baseAtk: 9 },
]

export const MOVES: Move[] = [
  { id: 'tackle', name: 'たいあたり', power: 5, accuracy: 0.95 },
  { id: 'clay_shot', name: 'クレイショット', power: 7, accuracy: 0.9 },
]

export function getSpecies(id: string) {
  const s = SPECIES.find((s) => s.id === id)
  if (!s) throw new Error(`Unknown species: ${id}`)
  return s
}

