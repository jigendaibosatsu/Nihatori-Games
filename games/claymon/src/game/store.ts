import type { BattleState, Claymon, GameState, PlayerState } from './types'
import { getSpecies } from './data'
import { mulberry32, randomInt } from './rng'

const SAVE_KEY = 'claymon-save-v1'

let state: GameState = initDefaultState()
const listeners: Array<() => void> = []

export function getState(): GameState {
  return state
}

export function subscribe(fn: () => void): () => void {
  listeners.push(fn)
  return () => {
    const i = listeners.indexOf(fn)
    if (i >= 0) listeners.splice(i, 1)
  }
}

function emit() {
  listeners.forEach((l) => l())
}

export function setState(updater: (prev: GameState) => GameState) {
  state = updater(state)
  emit()
}

function initDefaultState(): GameState {
  const starter = createClaymon('clayling', 3, Date.now())
  const player: PlayerState = {
    x: 3,
    y: 3,
    party: [starter],
    box: [],
    dex: { [starter.speciesId]: { seen: true, caught: true } },
  }
  return {
    scene: 'OVERWORLD',
    player,
  }
}

export function loadState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw) as GameState
    state = parsed
    emit()
  } catch {
    // ignore
  }
}

export function saveState() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state))
  } catch {
    // ignore
  }
}

function createClaymon(speciesId: string, level: number, seed: number): Claymon {
  const s = getSpecies(speciesId)
  const rng = mulberry32(seed)
  const hp = s.baseHp + randomInt(rng, 0, 4) + level * 2
  const maxHp = hp
  return {
    uid: `${speciesId}-${seed}`,
    speciesId,
    level,
    hp,
    maxHp,
  }
}

// --- Overworld ---

const MAP_WIDTH = 7
const MAP_HEIGHT = 5

type Tile = 'plain' | 'grass' | 'ruin'

const MAP: Tile[][] = [
  ['plain', 'plain', 'grass', 'grass', 'grass', 'plain', 'plain'],
  ['plain', 'grass', 'grass', 'grass', 'grass', 'grass', 'plain'],
  ['plain', 'grass', 'ruin', 'ruin', 'grass', 'grass', 'plain'],
  ['plain', 'grass', 'grass', 'grass', 'grass', 'plain', 'plain'],
  ['plain', 'plain', 'grass', 'grass', 'plain', 'plain', 'plain'],
]

export function getMap() {
  return { width: MAP_WIDTH, height: MAP_HEIGHT, tiles: MAP }
}

export function movePlayer(dx: number, dy: number) {
  setState((prev) => {
    if (prev.scene !== 'OVERWORLD') return prev
    const nx = Math.max(0, Math.min(MAP_WIDTH - 1, prev.player.x + dx))
    const ny = Math.max(0, Math.min(MAP_HEIGHT - 1, prev.player.y + dy))
    const tile = MAP[ny]?.[nx] ?? 'plain'
    let next: GameState = {
      ...prev,
      player: { ...prev.player, x: nx, y: ny },
    }
    if (tile === 'grass' || tile === 'ruin') {
      if (Math.random() < 0.35) {
        next = startBattle(next)
      }
    }
    return next
  })
}

// --- Battle ---

function startBattle(prev: GameState): GameState {
  const wild = createClaymon('clayling', randomInt(mulberry32(Date.now()), 2, 4), Date.now())
  const playerMon = prev.player.party[0]
  if (!playerMon) return prev
  const battle: BattleState = {
    playerMon: { ...playerMon },
    wildMon: wild,
    turn: 'player',
  }
  return {
    ...prev,
    scene: 'BATTLE',
    battle,
  }
}

export function useTackle() {
  setState((prev) => {
    if (prev.scene !== 'BATTLE' || !prev.battle) return prev
    const b = { ...prev.battle, playerMon: { ...prev.battle.playerMon }, wildMon: { ...prev.battle.wildMon } }
    if (b.turn !== 'player') return prev
    b.wildMon.hp = Math.max(0, b.wildMon.hp - 5)
    if (b.wildMon.hp <= 0) {
      const player = { ...prev.player }
      player.dex = {
        ...player.dex,
        [b.wildMon.speciesId]: { seen: true, caught: player.dex[b.wildMon.speciesId]?.caught ?? false },
      }
      player.party = player.party.map((m, i) => (i === 0 ? b.playerMon : m))
      return {
        scene: 'OVERWORLD',
        player,
      }
    }
    b.turn = 'enemy'
    const afterEnemy = enemyTurn(prev, b)
    return afterEnemy
  })
}

function enemyTurn(prev: GameState, battle: BattleState): GameState {
  const b = { ...battle, playerMon: { ...battle.playerMon }, wildMon: { ...battle.wildMon } }
  b.playerMon.hp = Math.max(0, b.playerMon.hp - 3)
  if (b.playerMon.hp <= 0) {
    // fainted, send back to overworld with heal
    const player = { ...prev.player }
    player.party = player.party.map((m, i) =>
      i === 0 ? { ...m, hp: m.maxHp } : m,
    )
    return {
      scene: 'OVERWORLD',
      player,
    }
  }
  b.turn = 'player'
  return { ...prev, scene: 'BATTLE', battle: b }
}

export function tryCapture() {
  setState((prev) => {
    if (prev.scene !== 'BATTLE' || !prev.battle) return prev
    const { battle } = prev
    const hpRatio = battle.wildMon.hp / battle.wildMon.maxHp
    const base = 0.5
    const bonus = hpRatio < 0.5 ? 0.3 : 0
    const chance = base + bonus
    if (Math.random() < chance) {
      const player = { ...prev.player }
      const caught = battle.wildMon
      player.party =
        player.party.length < 3
          ? [...player.party, caught]
          : player.party
      player.box =
        player.party.length >= 3
          ? [...player.box, caught]
          : player.box
      player.dex = {
        ...player.dex,
        [caught.speciesId]: { seen: true, caught: true },
      }
      return {
        scene: 'OVERWORLD',
        player,
      }
    }
    // failed -> enemy turn
    const afterEnemy = enemyTurn(prev, prev.battle)
    return afterEnemy
  })
}

export function runFromBattle() {
  setState((prev) => {
    if (prev.scene !== 'BATTLE') return prev
    return {
      scene: 'OVERWORLD',
      player: prev.player,
    }
  })
}

