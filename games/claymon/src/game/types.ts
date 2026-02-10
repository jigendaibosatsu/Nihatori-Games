export type ClayType = 'CLAY' | 'METAL' | 'DRAGON' | 'ARTIFACT'

export interface Species {
  id: string
  name: string
  types: ClayType[]
  baseHp: number
  baseAtk: number
}

export interface Move {
  id: string
  name: string
  power: number
  accuracy: number
}

export interface Claymon {
  uid: string
  speciesId: string
  level: number
  hp: number
  maxHp: number
}

export interface DexEntry {
  seen: boolean
  caught: boolean
}

export interface PlayerState {
  x: number
  y: number
  party: Claymon[]
  box: Claymon[]
  dex: Record<string, DexEntry>
}

export type Scene = 'OVERWORLD' | 'BATTLE' | 'DEX'

export interface BattleState {
  playerMon: Claymon
  wildMon: Claymon
  turn: 'player' | 'enemy'
}

export interface GameState {
  scene: Scene
  player: PlayerState
  battle?: BattleState
}

