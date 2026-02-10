import type { Rarity } from '../game/types'

export function formatInt(n: number): string {
  return Math.floor(n).toLocaleString('ja-JP')
}

export function rarityLabelJa(r: Rarity): string {
  switch (r) {
    case 'C':
      return 'コモン'
    case 'U':
      return 'アンコモン'
    case 'R':
      return 'レア'
    case 'SR':
      return 'スーパーレア'
    case 'UR':
      return 'ウルトラレア'
  }
}

export function rarityColor(r: Rarity): string {
  switch (r) {
    case 'C':
      return '#8aa0b8'
    case 'U':
      return '#4bd3ff'
    case 'R':
      return '#7c5cff'
    case 'SR':
      return '#ff5c7c'
    case 'UR':
      return '#ffcc00'
  }
}

