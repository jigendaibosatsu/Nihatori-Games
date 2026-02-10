export type Orientation = 'H' | 'V'

export interface Car {
  id: string
  x: number
  y: number
  length: number
  orientation: Orientation
  isPlayer?: boolean
}

export interface Level {
  id: string
  width: number
  height: number
  exitRow: number
  cars: Car[]
}

export interface Board {
  levelId: string
  width: number
  height: number
  exitRow: number
  cars: Car[]
  moves: number
}

export const LEVELS: Level[] = [
  {
    id: 'easy-1',
    width: 6,
    height: 6,
    exitRow: 2,
    cars: [
      // player car (red)
      { id: 'X', x: 1, y: 2, length: 2, orientation: 'H', isPlayer: true },
      { id: 'A', x: 0, y: 0, length: 2, orientation: 'H' },
      { id: 'B', x: 3, y: 0, length: 3, orientation: 'V' },
      { id: 'C', x: 0, y: 3, length: 3, orientation: 'H' },
      { id: 'D', x: 4, y: 3, length: 2, orientation: 'V' },
      { id: 'E', x: 5, y: 1, length: 3, orientation: 'V' }
    ],
  },
]

export function createBoard(level: Level): Board {
  return {
    levelId: level.id,
    width: level.width,
    height: level.height,
    exitRow: level.exitRow,
    cars: level.cars.map((c) => ({ ...c })),
    moves: 0,
  }
}

export function buildOccupancy(board: Board): (number | null)[] {
  const total = board.width * board.height
  const grid: (number | null)[] = Array(total).fill(null)
  board.cars.forEach((car, idx) => {
    const { x, y, length, orientation } = car
    for (let i = 0; i < length; i++) {
      const cx = orientation === 'H' ? x + i : x
      const cy = orientation === 'V' ? y + i : y
      if (cx < 0 || cy < 0 || cx >= board.width || cy >= board.height) continue
      grid[cy * board.width + cx] = idx
    }
  })
  return grid
}

export function canMove(board: Board, carIndex: number, delta: number): boolean {
  const car = board.cars[carIndex]
  if (!car) return false
  if (delta === 0) return false
  const dir = delta > 0 ? 1 : -1
  const steps = Math.abs(delta)
  const grid = buildOccupancy(board)

  for (let s = 1; s <= steps; s++) {
    const offset = dir * s
    if (car.orientation === 'H') {
      const head = dir > 0 ? car.x + car.length - 1 : car.x
      const nx = head + offset
      const ny = car.y
      if (nx < 0 || nx >= board.width) return false
      const idx = ny * board.width + nx
      const occ = grid[idx]
      if (occ !== null && occ !== carIndex) return false
    } else {
      const head = dir > 0 ? car.y + car.length - 1 : car.y
      const nx = car.x
      const ny = head + offset
      if (ny < 0 || ny >= board.height) return false
      const idx = ny * board.width + nx
      const occ = grid[idx]
      if (occ !== null && occ !== carIndex) return false
    }
  }
  return true
}

export function moveCar(board: Board, carIndex: number, delta: number): Board {
  if (!canMove(board, carIndex, delta)) return board
  const dir = delta > 0 ? 1 : -1
  const steps = Math.abs(delta)
  const next: Board = {
    ...board,
    cars: board.cars.map((c) => ({ ...c })),
    moves: board.moves + steps,
  }
  const car = next.cars[carIndex]!
  if (car.orientation === 'H') {
    car.x += dir * steps
  } else {
    car.y += dir * steps
  }
  return next
}

export function isSolved(board: Board): boolean {
  const playerIndex = board.cars.findIndex((c) => c.isPlayer)
  if (playerIndex === -1) return false
  const car = board.cars[playerIndex]!
  if (car.orientation !== 'H') return false
  const tailX = car.x + car.length - 1
  return car.y === board.exitRow && tailX === board.width - 1
}

