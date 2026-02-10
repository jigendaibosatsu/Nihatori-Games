import './App.css'
import { useState } from 'react'
import { backToTitle, createInitialState, finishGame, startGame } from './game/fsm'
import type { Board } from './game/board'
import { LEVELS, buildOccupancy, createBoard, moveCar } from './game/board'

export default function App() {
  const [state, setState] = useState(createInitialState)
  const [levelIndex, setLevelIndex] = useState(0)
  const [board, setBoard] = useState<Board>(() => createBoard(LEVELS[0]!))
  const [selected, setSelected] = useState<number | null>(null)

  function resetLevel(nextIndex = levelIndex) {
    const lvl = LEVELS[nextIndex]!
    setLevelIndex(nextIndex)
    setBoard(createBoard(lvl))
    setSelected(null)
  }

  function handleTileClick(cellIndex: number) {
    if (state.scene !== 'MAIN') return
    const occ = buildOccupancy(board)
    const carIndex = occ[cellIndex]
    if (carIndex == null) {
      setSelected(null)
      return
    }
    setSelected(carIndex)
  }

  function handleMove(delta: -1 | 1) {
    if (state.scene !== 'MAIN') return
    if (selected == null) return
    const next = moveCar(board, selected, delta)
    if (next === board) return
    const solvedBefore = false
    const solvedAfter = next.levelId === board.levelId && isSolved(next)
    setBoard(next)
    if (!solvedBefore && solvedAfter) {
      const score = Math.max(1, 500 - next.moves * 10)
      setState((prev) => finishGame(prev, score))
    }
  }

  return (
    <div className="app-root">
      <a href="/index.html" className="app-back">
        ← トップへ戻る
      </a>

      <div className="frame">
        {state.scene === 'TITLE' && (
          <>
            <div className="title-main">Car Escape</div>
            <div className="title-sub">赤い車を出口まで動かすスライドパズル</div>
            <div className="btn-row">
              <button
                type="button"
                className="btn"
                onClick={() => {
                  resetLevel(0)
                  setState((prev) => startGame(prev))
                }}
              >
                ステージ1から始める
              </button>
            </div>
          </>
        )}

        {state.scene === 'MAIN' && (
          <>
            <div className="title-main">ステージ {levelIndex + 1}</div>
            <div className="title-sub">手数: {board.moves}</div>
            <div className="btn-row">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => resetLevel(levelIndex)}
              >
                リセット
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setState((prev) => backToTitle(prev))}
              >
                タイトルへ
              </button>
            </div>

            <div className="scene-label">
              車をタップして選択し、向きに合わせて「←」「→」で動かします。赤い車を右端の出口まで出そう。
            </div>

            <BoardView
              board={board}
              selected={selected}
              onSelectIndex={handleTileClick}
            />

            {selected != null && (
              <div className="btn-row">
                <button type="button" className="btn" onClick={() => handleMove(-1)}>
                  ←
                </button>
                <button type="button" className="btn" onClick={() => handleMove(1)}>
                  →
                </button>
              </div>
            )}
          </>
        )}

        {state.scene === 'RESULT' && (
          <>
            <div className="title-main">クリア！</div>
            <div className="title-sub">手数: {board.moves} / スコア: {state.lastScore}</div>
            <div className="btn-row">
              <button
                type="button"
                className="btn"
                onClick={() => {
                  resetLevel(levelIndex)
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

import { isSolved } from './game/board'
import type { FC } from 'react'

const BoardView: FC<{
  board: Board
  selected: number | null
  onSelectIndex: (cellIndex: number) => void
}> = ({ board, selected, onSelectIndex }) => {
  const occ = buildOccupancy(board)
  return (
    <div
      className="board"
      style={{
        gridTemplateColumns: `repeat(${board.width}, 1fr)`,
      }}
    >
      {occ.map((carIndex, i) => {
        const isExit = Math.floor(i / board.width) === board.exitRow && i % board.width === board.width - 1
        const car = carIndex != null ? board.cars[carIndex] : null
        const isPlayer = !!car?.isPlayer
        const isSel = carIndex != null && carIndex === selected
        const classes = ['tile']
        if (isExit) classes.push('exit')
        if (car) {
          classes.push('car')
          if (isPlayer) classes.push('player')
        }
        if (isSel) classes.push('selected')
        return (
          <button
            key={i}
            type="button"
            className={classes.join(' ')}
            onClick={() => onSelectIndex(i)}
          >
            {car && car.isPlayer ? '🚗' : car ? '' : isExit ? '⟶' : ''}
          </button>
        )
      })}
    </div>
  )
}

