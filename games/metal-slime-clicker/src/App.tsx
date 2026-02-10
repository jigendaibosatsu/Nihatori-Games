import './App.css'
import { useEffect, useState } from 'react'

type EnemyType = 'normal' | 'elite' | 'metal'

interface Enemy {
  id: string
  name: string
  type: EnemyType
  maxHp: number
  hp: number
  goldReward: number
}

interface Save {
  gold: number
  totalKills: number
  metalKills: number
  clickPower: number
}

const SAVE_KEY = 'metal-slime-clicker-save-v1'

function loadSave(): Save {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) throw new Error()
    return JSON.parse(raw) as Save
  } catch {
    return {
      gold: 0,
      totalKills: 0,
      metalKills: 0,
      clickPower: 1,
    }
  }
}

export default function App() {
  const [save, setSave] = useState<Save>(() => loadSave())
  const [enemy, setEnemy] = useState<Enemy>(() => spawnEnemy())
  const [log, setLog] = useState<string>('スライム工場の入口に、モンスターがあらわれた。')

  useEffect(() => {
    const id = setInterval(() => {
      localStorage.setItem(SAVE_KEY, JSON.stringify(save))
    }, 5000)
    return () => clearInterval(id)
  }, [save])

  function handleClick() {
    setEnemy((prev) => {
      const nextHp = Math.max(0, prev.hp - save.clickPower)
      if (nextHp > 0) return { ...prev, hp: nextHp }

      // Defeated
      const reward = prev.goldReward
      const isMetal = prev.type === 'metal'
      setSave((s) => ({
        ...s,
        gold: s.gold + reward,
        totalKills: s.totalKills + 1,
        metalKills: s.metalKills + (isMetal ? 1 : 0),
      }))
      setLog(
        isMetal
          ? `メタルスライムをたおした！大量のゴールド +${reward}`
          : `${prev.name} をたおした。ゴールド +${reward}`,
      )
      return spawnEnemy()
    })
  }

  function tryUpgrade() {
    const cost = (save.clickPower + 1) * 10
    if (save.gold < cost) {
      setLog(`強化にゴールドが足りない。（必要: ${cost}）`)
      return
    }
    setSave((s) => ({
      ...s,
      gold: s.gold - cost,
      clickPower: s.clickPower + 1,
    }))
    setLog(`攻撃力が ${save.clickPower + 1} になった。`)
  }

  const hpRatio = enemy.hp / enemy.maxHp

  return (
    <div className="app-root">
      <a href="/index.html" className="app-back">
        ← トップへ戻る
      </a>

      <div className="frame">
        <div className="title-main">メタルスライム工場 ハクスラ</div>
        <div className="title-sub">タップだけで敵を倒して、たまに出るメタルを狩ろう。</div>

        <div className="enemy-card">
          <div className="enemy-name">
            {enemy.name} {enemy.type === 'metal' ? '★メタル★' : ''}
          </div>
          <div className="enemy-hp">
            HP {enemy.hp} / {enemy.maxHp}
          </div>
          <div className="hp-bar">
            <div className="hp-inner" style={{ width: `${hpRatio * 100}%` }} />
          </div>
        </div>

        <div className="meta">
          攻撃力: <strong>{save.clickPower}</strong> / ゴールド: <strong>{save.gold}</strong>
          <br />
          討伐数: <strong>{save.totalKills}</strong> / メタル討伐: <strong>{save.metalKills}</strong>
        </div>

        <div className="btn-row">
          <button type="button" className="btn" onClick={handleClick}>
            攻撃する（タップ）
          </button>
          <button type="button" className="btn btn-secondary" onClick={tryUpgrade}>
            攻撃力アップ
          </button>
        </div>

        <div className="log">{log}</div>
      </div>
    </div>
  )
}

function spawnEnemy(): Enemy {
  const r = Math.random()
  if (r < 0.08) {
    // metal slime
    return {
      id: 'metal',
      name: 'メタルスライム',
      type: 'metal',
      maxHp: 3,
      hp: 3,
      goldReward: 100,
    }
  }
  if (r < 0.3) {
    return {
      id: 'elite',
      name: 'エリートスライム',
      type: 'elite',
      maxHp: 30,
      hp: 30,
      goldReward: 15,
    }
  }
  return {
    id: 'normal',
    name: 'ならしスライム',
    type: 'normal',
    maxHp: 15,
    hp: 15,
    goldReward: 5,
  }
}

