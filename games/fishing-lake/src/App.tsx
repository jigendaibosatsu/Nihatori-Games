import './App.css'
import { useEffect, useState } from 'react'
import { backToTitle, createInitialState, finishGame, startGame } from './game/fsm'
import { rollFish } from './game/fish'

interface CatchRecord {
  id: string
  name: string
  size: number
  rarity: string
}

const BEST_KEY = 'fishing-lake-best'

export default function App() {
  const [state, setState] = useState(createInitialState)
  const [gauge, setGauge] = useState(0)
  const [dir, setDir] = useState<1 | -1>(1)
  const [running, setRunning] = useState(false)
  const [casts, setCasts] = useState(0)
  const [hits, setHits] = useState(0)
  const [lastCatch, setLastCatch] = useState<CatchRecord | null>(null)
  const [records, setRecords] = useState<CatchRecord[]>([])
  const [bestHits, setBestHits] = useState<number | null>(null)

  useEffect(() => {
    const raw = localStorage.getItem(BEST_KEY)
    if (raw) {
      const v = Number(raw)
      if (!Number.isNaN(v) && v > 0) setBestHits(v)
    }
  }, [])

  useEffect(() => {
    if (!running || state.scene !== 'MAIN') return
    let frame: number
    let last = performance.now()
    const loop = (now: number) => {
      const dt = (now - last) / 1000
      last = now
      setGauge((prev) => {
        let g = prev + dir * dt * 0.8 // speed
        let nd = dir
        if (g > 1) {
          g = 1 - (g - 1)
          nd = -1
        } else if (g < 0) {
          g = -g
          nd = 1
        }
        setDir(nd)
        return Math.max(0, Math.min(1, g))
      })
      frame = requestAnimationFrame(loop)
    }
    frame = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frame)
  }, [running, state.scene, dir])

  function startFishing() {
    setGauge(0)
    setDir(1)
    setCasts(0)
    setHits(0)
    setLastCatch(null)
    setRecords([])
    setRunning(true)
  }

  function handleCast() {
    if (state.scene !== 'MAIN') return
    setCasts((c) => c + 1)
    const inSweet = gauge > 0.4 && gauge < 0.6
    if (!inSweet) {
      setLastCatch(null)
      return
    }
    const seed = Date.now()
    const { fish, size } = rollFish(seed)
    const rec: CatchRecord = { id: fish.id, name: fish.name, size, rarity: fish.rarity }
    setLastCatch(rec)
    setHits((h) => h + 1)
    setRecords((prev) => [rec, ...prev].slice(0, 6))
  }

  function finishRun() {
    const score = hits * 100
    if (!bestHits || hits > bestHits) {
      setBestHits(hits)
      localStorage.setItem(BEST_KEY, String(hits))
    }
    setRunning(false)
    setState((prev) => finishGame(prev, score))
  }

  return (
    <div className="app-root">
      <a href="/index.html" className="app-back">
        ← トップへ戻る
      </a>

      <div className="frame">
        {state.scene === 'TITLE' && (
          <>
            <div className="title-main">Fishing Lake</div>
            <div className="title-sub">タイミングよく「釣る」を押して魚をヒット</div>
            <div className="btn-row">
              <button
                type="button"
                className="btn"
                onClick={() => {
                  startFishing()
                  setState((prev) => startGame(prev))
                }}
              >
                釣りを始める
              </button>
            </div>
            {bestHits !== null && (
              <div className="footer-hint">過去最多ヒット数: {bestHits}尾</div>
            )}
          </>
        )}

        {state.scene === 'MAIN' && (
          <>
            <div className="title-main">釣り中</div>
            <div className="title-sub">
              投げた回数: {casts} / ヒット: {hits}
            </div>

            <div className="gauge-wrap">
              <div className="gauge-bar">
                <div className="gauge-sweet" />
                <div className="gauge-pointer" style={{ left: `${gauge * 100}%` }} />
              </div>
              <div className="scene-label">黄色ゾーンで「釣る」を押すとヒット！</div>
            </div>

            <div className="btn-row">
              <button type="button" className="btn" onClick={handleCast}>
                釣る
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={finishRun}
              >
                やめる
              </button>
            </div>

            {lastCatch ? (
              <div className="catch-card">
                <div className="catch-name">
                  {lastCatch.name} / {lastCatch.size}cm
                </div>
                <div className="catch-rare">レア度: {lastCatch.rarity}</div>
              </div>
            ) : (
              <div className="scene-label">まだヒットしていません。</div>
            )}

            {records.length > 0 && (
              <div className="records">
                <div className="records-title">最近釣れた魚</div>
                <ul>
                  {records.map((r, i) => (
                    <li key={i}>
                      {r.name} / {r.size}cm ({r.rarity})
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        {state.scene === 'RESULT' && (
          <>
            <div className="title-main">釣り終了</div>
            <div className="title-sub">
              ヒット数: {hits}尾 / スコア: {state.lastScore}
            </div>
            {bestHits !== null && (
              <div className="scene-label">過去最多ヒット数: {bestHits}尾</div>
            )}
            <div className="btn-row">
              <button
                type="button"
                className="btn"
                onClick={() => {
                  startFishing()
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
