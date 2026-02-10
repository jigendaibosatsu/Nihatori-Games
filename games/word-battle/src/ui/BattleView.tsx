import { useMemo, useState } from 'react'
import type { BattleUnit } from '../game/types'
import type { AppState } from '../store/store'
import { battleEndTurn, battlePlay, closeBattle, db, startBattle } from '../store/store'
import { rarityColor, rarityLabelJa } from './format'

function Lane(props: { title: string; unit: BattleUnit | null }) {
  const u = props.unit
  if (!u) return <div className="lane empty">{props.title}</div>
  const color = rarityColor(u.rarity)
  return (
    <div className="lane" style={{ borderColor: color }}>
      <div className="lane-name">{u.nameJa}</div>
      <div className="lane-hp">HP {u.hp}/{u.maxHp}</div>
      <div className="lane-atk">ATK {u.atk}</div>
    </div>
  )
}

export function BattleView(props: { state: AppState }) {
  const battle = props.state.battle
  const [lane, setLane] = useState(1)

  const hand = useMemo(() => {
    if (!battle) return []
    return battle.player.hand.map((id) => db.byId[id]).filter(Boolean)
  }, [battle])

  if (!battle) {
    return (
      <div className="screen">
        <div className="panel">
          <div className="panel-title">バトル（簡易AI）</div>
          <div className="muted">3レーン・12ターン・約3分目標。</div>
          <button type="button" className="btn" onClick={startBattle}>
            バトル開始
          </button>
          <div className="muted" style={{ marginTop: 8 }}>
            ※デッキが10枚未満ならデッキ画面へ誘導されます
          </div>
        </div>
      </div>
    )
  }

  const isPlayer = battle.phase === 'player'

  return (
    <div className="screen battle-screen">
      <div className="panel battle-top">
        <div className="row-between">
          <div>
            <div className="panel-title">ターン {battle.turn}/{battle.maxTurns}</div>
            <div className="muted">{isPlayer ? 'あなたのターン' : battle.phase === 'enemy' ? '相手のターン' : '終了'}</div>
          </div>
          <div className="battle-hp">
            <div className="hp-pill">あなた HP {battle.player.hp}</div>
            <div className="hp-pill enemy">相手 HP {battle.enemy.hp}</div>
          </div>
        </div>

        <div className="row-between" style={{ marginTop: 10 }}>
          <div className="energy">⚡ {battle.player.energy}/{battle.player.maxEnergy}</div>
          {battle.phase === 'ended' ? (
            <button type="button" className="btn" onClick={closeBattle}>
              結果を閉じる
            </button>
          ) : (
            <button type="button" className="btn" onClick={battleEndTurn} disabled={!isPlayer}>
              ターン終了
            </button>
          )}
        </div>
      </div>

      <div className="lanes">
        <div className="lane-row enemy-row">
          <Lane title="相手 左" unit={battle.enemy.lanes[0]} />
          <Lane title="相手 中" unit={battle.enemy.lanes[1]} />
          <Lane title="相手 右" unit={battle.enemy.lanes[2]} />
        </div>
        <div className="lane-row player-row">
          <Lane title="自分 左" unit={battle.player.lanes[0]} />
          <Lane title="自分 中" unit={battle.player.lanes[1]} />
          <Lane title="自分 右" unit={battle.player.lanes[2]} />
        </div>
      </div>

      {battle.phase !== 'ended' && (
        <div className="panel">
          <div className="row-between">
            <div className="panel-title">手札</div>
            <div className="lane-picker" aria-label="レーン選択">
              {[0, 1, 2].map((i) => (
                <button
                  key={i}
                  type="button"
                  className={lane === i ? 'lane-btn is-active' : 'lane-btn'}
                  onClick={() => setLane(i)}
                >
                  {i === 0 ? '左' : i === 1 ? '中' : '右'}
                </button>
              ))}
            </div>
          </div>
          <div className="hand">
            {hand.map((c) => {
              const color = rarityColor(c.rarity)
              const disabled = !isPlayer || battle.player.energy < c.energyCost || (c.cardType === 'WORD' && battle.player.lanes[lane] != null)
              return (
                <button
                  key={c.cardId}
                  type="button"
                  className={disabled ? 'hand-card is-disabled' : 'hand-card'}
                  style={{ borderColor: color }}
                  disabled={disabled}
                  onClick={() => battlePlay(c.cardId, lane)}
                >
                  <div className="hand-top">
                    <span className="hand-name">{c.nameJa}</span>
                    <span className="hand-cost">⚡{c.energyCost}</span>
                  </div>
                  <div className="hand-mid">
                    <span className="hand-rarity" style={{ color }}>
                      {c.rarity}/{rarityLabelJa(c.rarity)}
                    </span>
                    {c.stats && <span className="hand-stats">ATK {c.stats.atk} / HP {c.stats.hp}</span>}
                  </div>
                  <div className="hand-ability">{c.ability.rulesTextJa}</div>
                </button>
              )
            })}
            {hand.length === 0 && <div className="muted">手札なし</div>}
          </div>
        </div>
      )}

      <div className="panel">
        <div className="panel-title">ログ</div>
        <div className="log">
          {battle.log.slice(-10).map((l, i) => (
            <div key={i} className="log-line">
              {l.textJa}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

