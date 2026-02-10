export type SceneId = 'TITLE' | 'MAIN' | 'RESULT'

export interface GameState {
  scene: SceneId
  lastScore: number
}

export function createInitialState(): GameState {
  return {
    scene: 'TITLE',
    lastScore: 0,
  }
}

export function startGame(prev: GameState): GameState {
  return {
    ...prev,
    scene: 'MAIN',
    lastScore: 0,
  }
}

export function finishGame(prev: GameState, score: number): GameState {
  return {
    ...prev,
    scene: 'RESULT',
    lastScore: score,
  }
}

export function backToTitle(prev: GameState): GameState {
  return {
    ...prev,
    scene: 'TITLE',
  }
}

