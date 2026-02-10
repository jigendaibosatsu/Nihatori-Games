import './App.css'
import { useEffect, useSyncExternalStore } from 'react'
import { getState, loadState, movePlayer, runFromBattle, saveState, subscribe, tryCapture, useTackle } from './game/store'
import { getSpecies } from './game/data'
import type { GameState } from './game/types'
import { getMap } from './game/store'

function useGameState(): GameState {
  return useSyncExternalStore(subscribe, getState, getState)
}

export default function App() {
  const state = useGameState()

  useEffect(() => {
    loadState()
    const id = setInterval(saveState, 10000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="app-root">
      <a href="/index.html" className="app-back">
        ← トップへ戻る
      </a>

      <div className="frame">
        <div className="title-main">CLAYMON 粘土モンスターRPG</div>
        <div className="title-sub">小さな村の周りで、クレイモンを集めて戦おう</div>

        {state.scene === 'OVERWORLD' && <OverworldView state={state} />}
        {state.scene === 'BATTLE' && <BattleView state={state} />}
      </div>
    </div>
  )
}

function OverworldView({ state }: { state: GameState }) {
  const map = getMap()
  return (
    <>
      <div className="map">
        <div
          className="map-grid"
          style={{ gridTemplateColumns: `repeat(${map.width}, 1fr)` }}
        >
          {map.tiles.flatMap((row, y) =>
            row.map((tile, x) => {
              const isPlayer = state.player.x === x && state.player.y === y
              const classes = ['tile', tile, isPlayer ? 'player' : ''].join(' ').trim()
              const emoji = isPlayer ? '◉' : tile === 'grass' ? '░' : tile === 'ruin' ? '▣' : '·'
              return (
                <div key={`${x}-${y}`} className={classes}>
                  {emoji}
                </div>
              )
            }),
          )}
        </div>
      </div>

      <div className="hud">
        パーティ:
        {state.player.party.map((m, i) => {
          const s = getSpecies(m.speciesId)
          return (
            <span key={m.uid}>
              {i > 0 && ' / '}
              {s.name} Lv{m.level} HP{m.hp}/{m.maxHp}
            </span>
          )
        })}
      </div>

      <div className="controls">
        <button type="button" className="btn" onClick={() => movePlayer(0, -1)}>↑</button>
        <button type="button" className="btn" onClick={() => movePlayer(-1, 0)}>←</button>
        <button type="button" className="btn" onClick={() => movePlayer(1, 0)}>→</button>
        <button type="button" className="btn" onClick={() => movePlayer(0, 1)}>↓</button>
      </div>
    </>
  )
}

function BattleView({ state }: { state: GameState }) {
  const battle = state.battle
  if (!battle) return null
  const playerSpecies = getSpecies(battle.playerMon.speciesId)
  const wildSpecies = getSpecies(battle.wildMon.speciesId)
  return (
    <>
      <div className="hud">
        野生の {wildSpecies.name} があらわれた！ / ターン: {battle.turn === 'player' ? 'プレイヤー' : '相手'}
      </div>
      <div className="battle">
        <div className="mon wild">
          <div>{wildSpecies.name}</div>
          <div>
            HP {battle.wildMon.hp}/{battle.wildMon.maxHp}
          </div>
        </div>
        <div className="mon player">
          <div>{playerSpecies.name}</div>
          <div>
            HP {battle.playerMon.hp}/{battle.playerMon.maxHp}
          </div>
        </div>
      </div>
      <div className="controls">
        <button type="button" className="btn" onClick={useTackle}>
          こうげき
        </button>
        <button type="button" className="btn" onClick={tryCapture}>
          つかまえる
        </button>
        <button type="button" className="btn btn-secondary" onClick={runFromBattle}>
          逃げる
        </button>
      </div>
    </>
  )
}

