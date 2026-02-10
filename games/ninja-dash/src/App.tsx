import './App.css'
import { useEffect, useState } from 'react'
import { backToTitle, createInitialState, finishGame, startGame } from './game/fsm'

interface Obstacle {
  lane: number
  x: number
}

const BEST_KEY = 'ninja-dash-best'
const LANE_COUNT = 3
const COLS = 6

export default function App() {
  const [state, setState] = useState(createInitialState)
  const [lane, setLane] = useState(1)
  const [obstacles, setObstacles] = useState<Obstacle[]>([])
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
      setObstacles((prev) => {
        const moved = prev
          .map((o) => ({ ...o, x: o.x - 1 }))
          .filter((o) => o.x >= 0)
        const chance = Math.random()
        if (chance < 0.4) {
          moved.push({ lane: Math.floor(Math.random() * LANE_COUNT), x: COLS - 1 })
        }
        return moved
      })
    }, 220)
    return () => clearInterval(interval)
  }, [running, state.scene])

  useEffect(() => {
    if (!running || state.scene !== 'MAIN') return
    const hit = obstacles.some((o) => o.lane === lane && o.x === 1)
    if (hit) {
      const score = tick
      if (!bestScore || score > bestScore) {
        setBestScore(score)
        localStorage.setItem(BEST_KEY, String(score))
      }
      setRunning(false)
      setState((prev) => finishGame(prev, score))
    }
  }, [tick, obstacles, lane, running, state.scene, bestScore])

  function startRun() {
    setLane(1)
    setObstacles([{ lane: 2, x: 4 }])
    setTick(0)
    setRunning(true)
  }

  function moveLane(dir: -1 | 1) {
    setLane((l) => Math.max(0, Math.min(LANE_COUNT - 1, l + dir)))
  }

  return (
    <div className="app-root">
      <a href="/index.html" className="app-back">
        ← トップへ戻る
      </a>

      <div className="frame">
        {state.scene === 'TITLE' && (
          <>
            <div className="title-main">Ninja Dash</div>
            <div className="title-sub">障害物をよけ続ける3レーンランゲーム</div>
            <div className="btn-row">
              <button
                type="button"
                className="btn"
                onClick={() => {
                  startRun()
                  setState((prev) => startGame(prev))
                }}
              >
                走り出す
              </button>
            </div>
            {bestScore !== null && (
              <div className="footer-hint">ベスト距離: {bestScore}</div>
            )}
          </>
        )}

        {state.scene === 'MAIN' && (
          <>
            <div className="title-main">走行中</div>
            <div className="title-sub">距離: {tick}</div>

            <div className="lane-view">
              <Lanes lane={lane} obstacles={obstacles} />
            </div>

            <div className="scene-label">左右のボタンでレーン変更。赤い障害物をよけましょう。</div>

            <div className="controls">
              <button type="button" className="btn" onClick={() => moveLane(-1)}>
                ←
              </button>
              <button type="button" className="btn" onClick={() => moveLane(1)}>
                →
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
            <div className="title-main">転んでしまった…</div>
            <div className="title-sub">走った距離: {state.lastScore}</div>
            {bestScore !== null && (
              <div className="scene-label">ベスト距離: {bestScore}</div>
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
                もう一度走る
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

function Lanes(props: { lane: number; obstacles: Obstacle[] }) {
  const rows = []
  for (let r = 0; r < LANE_COUNT; r++) {
    const cells = []
    for (let c = 0; c < COLS; c++) {
      const isPlayer = r === props.lane && c === 1
      const hasObs = props.obstacles.some((o) => o.lane === r && o.x === c)
      const classes = ['cell']
      if (isPlayer) classes.push('player')
      if (hasObs) classes.push('obstacle')
      returnCell: cells.push(
        <div key={c} className={classes.join(' ')}>
        </div>,
      )
    }
    rows.push(
      <div key={r} className="lane">
        {cells}
      </div>,
    )
  }
  return <div className="lanes">{rows}</div>
}

