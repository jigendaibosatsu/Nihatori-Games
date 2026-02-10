import './App.css'
import { useEffect, useMemo, useState } from 'react'
import { backToTitle, createInitialState, finishGame, startGame } from './game/fsm'
import type { Board, Cell } from './game/board'
import { countFlags, createBoard, reveal, toggleFlag } from './game/board'

const WIDTH = 8
const HEIGHT = 8
const MINES = 10
const STORAGE_KEY = 'mines-lite-best'

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000)
  const sec = s % 60
  const min = Math.floor(s / 60)
  return `${min}:${sec.toString().padStart(2, '0')}`
}

export default function App() {
  const [state, setState] = useState(createInitialState)
  const [board, setBoard] = useState<Board>(() => createBoard(WIDTH, HEIGHT, MINES, Date.now()))
  const [mode, setMode] = useState<'reveal' | 'flag'>('reveal')
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [endedAt, setEndedAt] = useState<number | null>(null)
  const [bestTime, setBestTime] = useState<number | null>(null)

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const v = Number(raw)
      if (!Number.isNaN(v) && v > 0) setBestTime(v)
    }
  }, [])

  const elapsed = useMemo(() => {
    if (!startedAt) return 0
    if (endedAt) return endedAt - startedAt
    return Date.now() - startedAt
  }, [startedAt, endedAt, board])

  function newGame() {
    setBoard(createBoard(WIDTH, HEIGHT, MINES, Date.now()))
    setMode('reveal')
    setStartedAt(null)
    setEndedAt(null)
  }

  function handleCellClick(x: number, y: number) {
    if (state.scene !== 'MAIN') return
    if (!startedAt) setStartedAt(Date.now())

    if (mode === 'flag') {
      setBoard((b) => toggleFlag(b, x, y))
      return
    }

    setBoard((prev) => {
      const { board: next, hitMine, cleared } = reveal(prev, x, y)
      if (hitMine) {
        setEndedAt(Date.now())
        setState((s) => finishGame(s, 0))
      } else if (cleared) {
        const end = Date.now()
        setEndedAt(end)
        const time = end - (startedAt ?? end)
        if (!bestTime || time < bestTime) {
          setBestTime(time)
          localStorage.setItem(STORAGE_KEY, String(time))
        }
        setState((s) => finishGame(s, Math.max(1, Math.floor(100000 / Math.max(1, time)))))
      }
      return next
    })
  }

  function renderCell(c: Cell, i: number) {
    const x = i % board.width
    const y = Math.floor(i / board.width)
    const key = `${x}-${y}`
    let content = ''
    let cls = 'cell'

    if (c.state === 'hidden') {
      cls += ' hidden'
    } else if (c.state === 'flagged') {
      cls += ' flagged'
      content = '🚩'
    } else if (c.isMine) {
      cls += ' mine'
      content = '💣'
    } else if (c.adjacent > 0) {
      cls += ` n${c.adjacent}`
      content = String(c.adjacent)
    } else {
      cls += ' empty'
    }

    return (
      <button key={key} type="button" className={cls} onClick={() => handleCellClick(x, y)}>
        {content}
      </button>
    )
  }

  return (
    <div className="app-root">
      <a href="/index.html" className="app-back">
        ← トップへ戻る
      </a>

      <div className="frame">
        {state.scene === 'TITLE' && (
          <>
            <div className="title-main">Mines Lite</div>
            <div className="title-sub">スマホ向けシンプルマインスイーパー</div>
            <div className="btn-row">
              <button
                type="button"
                className="btn"
                onClick={() => {
                  newGame()
                  setState((prev) => startGame(prev))
                }}
              >
                ゲーム開始
              </button>
            </div>
            {bestTime && (
              <div className="footer-hint">
                ベストタイム: <strong>{formatTime(bestTime)}</strong>
              </div>
            )}
          </>
        )}

        {state.scene === 'MAIN' && (
          <>
            <div className="title-main">プレイ中</div>
            <div className="title-sub">
              {WIDTH}x{HEIGHT} / 地雷 {board.mineCount}（🚩 {countFlags(board)}）
            </div>
            <div className="btn-row">
              <button
                type="button"
                className={mode === 'reveal' ? 'btn' : 'btn btn-secondary'}
                onClick={() => setMode('reveal')}
              >
                開くモード
              </button>
              <button
                type="button"
                className={mode === 'flag' ? 'btn' : 'btn btn-secondary'}
                onClick={() => setMode('flag')}
              >
                旗モード
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  newGame()
                }}
              >
                リセット
              </button>
            </div>
            <div className="scene-label">タイム: {formatTime(elapsed)}</div>

            <div className="board" style={{ gridTemplateColumns: `repeat(${board.width}, 1fr)` }}>
              {board.cells.map((c, i) => renderCell(c, i))}
            </div>
          </>
        )}

        {state.scene === 'RESULT' && (
          <>
            <div className="title-main">リザルト</div>
            <div className="title-sub">
              {state.lastScore > 0 ? (
                <>
                  クリア！ スコア {state.lastScore} / タイム {formatTime(elapsed)}
                </>
              ) : (
                '地雷を踏んでしまった…'
              )}
            </div>
            {bestTime && (
              <div className="scene-label">
                ベストタイム: <strong>{formatTime(bestTime)}</strong>
              </div>
            )}
            <div className="btn-row">
              <button
                type="button"
                className="btn"
                onClick={() => {
                  newGame()
                  setState((prev) => startGame(prev))
                }}
              >
                もう一度
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setState((prev) => backToTitle(prev))
                }}
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
