export type CellState = 'hidden' | 'revealed' | 'flagged'

export interface Cell {
  isMine: boolean
  adjacent: number
  state: CellState
}

export interface Board {
  width: number
  height: number
  mineCount: number
  cells: Cell[]
}

export interface RevealResult {
  board: Board
  hitMine: boolean
  cleared: boolean
}

export function index(x: number, y: number, w: number): number {
  return y * w + x
}

export function createBoard(width: number, height: number, mineCount: number, seed: number): Board {
  const total = width * height
  const mines = Math.min(mineCount, total - 1)

  const cells: Cell[] = Array.from({ length: total }, () => ({
    isMine: false,
    adjacent: 0,
    state: 'hidden',
  }))

  const rng = mulberry32(seed)
  const positions = Array.from({ length: total }, (_, i) => i)
  for (let i = 0; i < mines; i++) {
    const r = i + Math.floor(rng() * (total - i))
    ;[positions[i], positions[r]] = [positions[r]!, positions[i]!]
    cells[positions[i]!]!.isMine = true
  }

  // compute adjacency
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = index(x, y, width)
      if (cells[idx]!.isMine) continue
      let count = 0
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue
          const nx = x + dx
          const ny = y + dy
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
          if (cells[index(nx, ny, width)]!.isMine) count++
        }
      }
      cells[idx]!.adjacent = count
    }
  }

  return { width, height, mineCount: mines, cells }
}

export function reveal(board: Board, x: number, y: number): RevealResult {
  const { width, height, cells } = board
  const idx = index(x, y, width)
  const cell = cells[idx]
  if (!cell || cell.state === 'revealed' || cell.state === 'flagged') {
    return { board, hitMine: false, cleared: isCleared(board) }
  }

  const newBoard: Board = {
    width,
    height,
    mineCount: board.mineCount,
    cells: cells.map((c) => ({ ...c })),
  }
  const queue: Array<{ x: number; y: number }> = [{ x, y }]
  let hitMine = false

  while (queue.length) {
    const { x: cx, y: cy } = queue.pop()!
    const ci = index(cx, cy, width)
    const c = newBoard.cells[ci]
    if (!c || c.state === 'revealed' || c.state === 'flagged') continue
    c.state = 'revealed'
    if (c.isMine) {
      hitMine = true
      continue
    }
    if (c.adjacent === 0) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue
          const nx = cx + dx
          const ny = cy + dy
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
          queue.push({ x: nx, y: ny })
        }
      }
    }
  }

  return { board: newBoard, hitMine, cleared: isCleared(newBoard) }
}

export function toggleFlag(board: Board, x: number, y: number): Board {
  const { width, height, cells } = board
  const idx = index(x, y, width)
  const c = cells[idx]
  if (!c || c.state === 'revealed') return board
  const newBoard: Board = {
    width,
    height,
    mineCount: board.mineCount,
    cells: cells.map((cell, i) =>
      i === idx
        ? {
            ...cell,
            state: cell.state === 'flagged' ? 'hidden' : 'flagged',
          }
        : cell,
    ),
  }
  return newBoard
}

export function isCleared(board: Board): boolean {
  return board.cells.every((c) => (c.isMine && c.state !== 'revealed') || (!c.isMine && c.state === 'revealed'))
}

export function countFlags(board: Board): number {
  return board.cells.filter((c) => c.state === 'flagged').length
}

// --- RNG (deterministic) ---

function mulberry32(seed: number): () => number {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

