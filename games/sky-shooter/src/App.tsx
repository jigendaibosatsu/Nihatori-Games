import './App.css'
import { useEffect, useState } from 'react'
import { backToTitle, createInitialState, finishGame, startGame } from './game/fsm'

interface Enemy {
  row: number
  col: number
}

const ROWS = 7
const COLS = 5
const BEST_KEY = 'sky-shooter-best'

export default function App() {
  const [state, setState] = useState(createInitialState)
  const [row, setRow] = useState(ROWS - 2)
  const [col, setCol] = useState(2)
  const [enemies, setEnemies] = useState<Enemy[]>([])
  const [tick, setTick] = useState(0)
  const [running, setRunning] = useState(false)
  const [bestScore, setBestScore] = useState<number | null>(null)

  useEffect(() => {
    const raw = localStorage.getItem(BEST_KEY)
    if (raw) {
      const v = Number(raw)
      if (!Number.isNaN(v) && v > 0) setBestScore(v)
    }
  }, [])

  useEffect(() => {
    if (!running || state.scene !== 'MAIN') return
    const interval = setInterval(() => {
      setTick((t) => t + 1)
      setEnemies((prev) => {
        const moved = prev
          .map((e) => ({ ...e, row: e.row + 1 }))
          .filter((e) => e.row < ROWS)
        if (Math.random() < 0.5) {
          moved.push({ row: 0, col: Math.floor(Math.random() * COLS) })
        }
        return moved
      })
    }, 220)
    return () => clearInterval(interval)
  }, [running, state.scene])

  useEffect(() => {
    if (!running || state.scene !== 'MAIN') return
    const hit = enemies.some((e) => e.row === row && e.col === col)
    if (hit) {
      const score = tick
      if (!bestScore || score > bestScore) {
        setBestScore(score)
        localStorage.setItem(BEST_KEY, String(score))
      }
      setRunning(false)
      setState((prev) => finishGame(prev, score))
    }
  }, [tick, enemies, row, col, running, state.scene, bestScore])

  function startRun() {
    setRow(ROWS - 2)
    setCol(2)
    setEnemies([{ row: 0, col: 2 }])
    setTick(0)
    setRunning(true)
  }

  function move(dx: -1 | 1, dy: -1 | 1 | 0) {
    setCol((c) => Math.max(0, Math.min(COLS - 1, c + dx)))
    setRow((r) => Math.max(0, Math.min(ROWS - 1, r + dy)))
  }

  return (
    <div className="app-root">
      <a href="/index.html" className="app-back">
        ← トップへ戻る
      </a>

      <div className="frame">
        {state.scene === 'TITLE' && (
          <>
            <div className="title-main">Sky Shooter</div>
            <div className="title-sub">敵編隊をよけながら空を飛び続けるシンプルSTG</div>
            <div className="btn-row">
              <button
                type="button"
                className="btn"
                onClick={() => {
                  startRun()
                  setState((prev) => startGame(prev))
                }}
              >
                飛び立つ
              </button>
            </div>
            {bestScore !== null && (
              <div className="footer-hint">ベストスコア: {bestScore}</div>
            )}
          </>
        )}

        {state.scene === 'MAIN' && (
          <>
            <div className="title-main">飛行中</div>
            <div className="title-sub">スコア: {tick}</div>

            <div className="field">
              <Grid row={row} col={col} enemies={enemies} />
            </div>

            <div className="scene-label">上下左右ボタンで自機を動かし、赤い敵をよけましょう。</div>

            <div className="controls">
              <button type="button" className="btn" onClick={() => move(0 as -1, -1)}>
                ↑
              </button>
              <button type="button" className="btn" onClick={() => move(-1, 0)}>
                ←
              </button>
              <button type="button" className="btn" onClick={() => move(1, 0)}>
                →
              </button>
              <button type="button" className="btn" onClick={() => move(0 as -1, 1)}>
                ↓
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setRunning(false)
                  setState((prev) => backToTitle(prev))
                }}
              >
                やめる
              </button>
            </div>
          </>
        )}

        {state.scene === 'RESULT' && (
          <>
            <div className="title-main">撃墜されてしまった…</div>
            <div className="title-sub">スコア: {state.lastScore}</div>
            {bestScore !== null && (
              <div className="scene-label">ベストスコア: {bestScore}</div>
            )}
            <div className="btn-row">
              <button
                type="button"
                className="btn"
                onClick={() => {
                  startRun()
                  setState((prev) => startGame(prev))
                }}
              >
                もう一度
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setState((prev) => backToTitle(prev))}
              >
                タイトルへ
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function Grid(props: { row: number; col: number; enemies: Enemy[] }) {
  const cells = []
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const isPlayer = r === props.row && c === props.col
      const hasEnemy = props.enemies.some((e) => e.row === r && e.col === c)
      const classes = ['cell']
      if (hasEnemy) classes.push('enemy')
      if (isPlayer) classes.push('player')
      cells.push(<div key={`${r}-${c}`} className={classes.join(' ')} />)
    }
  }
  return <div className="grid">{cells}</div>
}

