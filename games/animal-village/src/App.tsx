import './App.css'
import { useState } from 'react'
import { backToTitle, createInitialState, finishGame, startGame } from './game/fsm'

type TileKind = 'grass' | 'tree' | 'rock' | 'water' | 'house' | 'villager'

const MAP_WIDTH = 8
const MAP_HEIGHT = 6

const MAP: TileKind[][] = [
  ['water', 'water', 'water', 'water', 'water', 'water', 'water', 'water'],
  ['water', 'grass', 'grass', 'tree', 'grass', 'grass', 'grass', 'water'],
  ['water', 'grass', 'villager', 'grass', 'tree', 'rock', 'grass', 'water'],
  ['water', 'grass', 'grass', 'grass', 'grass', 'grass', 'house', 'water'],
  ['water', 'tree', 'grass', 'rock', 'grass', 'grass', 'grass', 'water'],
  ['water', 'water', 'water', 'water', 'water', 'water', 'water', 'water'],
]

interface Item {
  id: string
  name: string
}

export default function App() {
  const [state, setState] = useState(createInitialState)
  const [x, setX] = useState(2)
  const [y, setY] = useState(3)
  const [bag, setBag] = useState<Item[]>([])
  const [message, setMessage] = useState<string>('木や石、どうぶつに話しかけてみよう。')

  function move(dx: number, dy: number) {
    const nx = Math.max(0, Math.min(MAP_WIDTH - 1, x + dx))
    const ny = Math.max(0, Math.min(MAP_HEIGHT - 1, y + dy))
    if (MAP[ny]?.[nx] === 'water') {
      setMessage('ここは海で進めない。')
      return
    }
    setX(nx)
    setY(ny)
    setMessage('のんびりお散歩中。')
  }

  function interact() {
    const tile = MAP[y]?.[x]
    if (!tile) return
    if (tile === 'tree') {
      const item: Item = { id: 'fruit', name: 'フルーツ' }
      setBag((prev) => [...prev, item])
      setMessage('木からフルーツを1つ手に入れた！')
    } else if (tile === 'rock') {
      const item: Item = { id: 'fossil', name: 'ふしぎな石' }
      setBag((prev) => [...prev, item])
      setMessage('地面からふしぎな石を掘り出した！')
    } else if (tile === 'villager') {
      const hasFruit = bag.some((i) => i.id === 'fruit')
      if (hasFruit) {
        setMessage('どうぶつ「フルーツありがとう！これはお礼だよ。」')
        setBag((prev) => prev.filter((i, idx) => !(i.id === 'fruit' && idx === prev.findIndex((x) => x.id === 'fruit'))))
        const item: Item = { id: 'ticket', name: 'おでかけチケット' }
        setBag((prev) => [...prev, item])
      } else {
        setMessage('どうぶつ「なにかおいしいもの、持ってない？」')
      }
    } else if (tile === 'house') {
      const hasTicket = bag.some((i) => i.id === 'ticket')
      if (hasTicket) {
        setMessage('家のポストにチケットを入れた。今日はここまでにしよう。')
        const score = bag.length * 50
        setState((prev) => finishGame(prev, score))
      } else {
        setMessage('自分の家。ポストになにか入れたくなる…。')
      }
    } else {
      setMessage('風の音だけが聞こえる。')
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
            <div className="title-main">Animal Village</div>
            <div className="title-sub">小さな村を歩き回って、のんびり採集</div>
            <div className="btn-row">
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setX(2)
                  setY(3)
                  setBag([])
                  setMessage('木や石、どうぶつに話しかけてみよう。')
                  setState((prev) => startGame(prev))
                }}
              >
                村へ行く
              </button>
            </div>
            <div className="footer-hint">MVP版：1画面の村で採集＆会話だけ楽しむ軽いお散歩ゲームです。</div>
          </>
        )}

        {state.scene === 'MAIN' && (
          <>
            <div className="title-main">村をおさんぽ中</div>
            <div className="title-sub">
              持ち物: {bag.length}個
            </div>

            <div className="map">
              <div className="map-grid">
                {MAP.flatMap((row, yy) =>
                  row.map((tile, xx) => {
                    const isPlayer = x === xx && y === yy
                    const classes = ['tile', tile, isPlayer ? 'player' : ''].join(' ').trim()
                    const emoji =
                      isPlayer ? '🧍' :
                      tile === 'tree' ? '🌳' :
                      tile === 'rock' ? '🪨' :
                      tile === 'water' ? '🌊' :
                      tile === 'house' ? '🏠' :
                      tile === 'villager' ? '🐻' :
                      ' '
                    return (
                      <div key={`${xx}-${yy}`} className={classes}>
                        {emoji}
                      </div>
                    )
                  }),
                )}
              </div>
            </div>

            <div className="hud">{message}</div>

            <div className="controls">
              <button type="button" className="btn" onClick={() => move(0, -1)}>↑</button>
              <button type="button" className="btn" onClick={() => move(-1, 0)}>←</button>
              <button type="button" className="btn" onClick={() => move(1, 0)}>→</button>
              <button type="button" className="btn" onClick={() => move(0, 1)}>↓</button>
              <button type="button" className="btn btn-secondary" onClick={interact}>A: 話す／採る</button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setState((prev) => backToTitle(prev))}
              >
                タイトルへ
              </button>
            </div>

            <div className="inv">
              <div>持ち物:</div>
              {bag.length === 0 ? (
                <div>なにも持っていない。</div>
              ) : (
                <ul>
                  {bag.map((i, idx) => (
                    <li key={idx}>{i.name}</li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}

        {state.scene === 'RESULT' && (
          <>
            <div className="title-main">きょうの一日が終わった</div>
            <div className="title-sub">集めたもの: {bag.length}個 / スコア: {state.lastScore}</div>
            <div className="btn-row">
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setX(2)
                  setY(3)
                  setBag([])
                  setMessage('木や石、どうぶつに話しかけてみよう。')
                  setState((prev) => startGame(prev))
                }}
              >
                もう一日あそぶ
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
