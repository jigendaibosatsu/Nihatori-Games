import { useMemo, useState } from 'react'
import type { AppState } from '../store/store'
import { VOCAB_V1 } from '../data/vocab_v1'
import { formatInt } from './format'

function masteryPercent(seen: number, correct: number): number {
  if (seen <= 0) return 0
  return Math.max(0, Math.min(100, Math.round((correct / seen) * 100)))
}

export function WordDexView(props: { state: AppState }) {
  const [selected, setSelected] = useState<string | null>(null)
  const mastery = props.state.save.player.mastery

  const list = useMemo(() => {
    return VOCAB_V1.map((v) => {
      const m = mastery[v.id]
      const seen = m?.seen ?? 0
      const correct = m?.correct ?? 0
      const pct = masteryPercent(seen, correct)
      return { v, seen, correct, pct, used: m?.battleUsed ?? 0, wins: m?.battleWins ?? 0 }
    }).sort((a, b) => b.pct - a.pct)
  }, [mastery])

  const item = selected ? list.find((x) => x.v.id === selected) : null

  return (
    <div className="screen">
      <div className="panel">
        <div className="panel-title">WordDex（英単語図鑑）</div>
        <div className="muted">学習は“結果”として見せる。遊んだ分だけ埋まる。</div>
      </div>

      {item && (
        <div className="panel">
          <div className="row-between">
            <div>
              <div className="panel-title">{item.v.head}</div>
              <div className="muted">{item.v.meaningJa}（{item.v.cefr}/{item.v.pos}）</div>
            </div>
            <button type="button" className="btn btn-small" onClick={() => setSelected(null)}>
              閉じる
            </button>
          </div>
          <div className="worddex-detail">
            <div className="worddex-row">
              <div className="k">例文</div>
              <div className="v">{item.v.example}</div>
            </div>
            {item.v.phonetic && (
              <div className="worddex-row">
                <div className="k">発音</div>
                <div className="v">{item.v.phonetic}</div>
              </div>
            )}
            <div className="worddex-row">
              <div className="k">習熟</div>
              <div className="v">{item.pct}%（正解 {formatInt(item.correct)} / 出題 {formatInt(item.seen)}）</div>
            </div>
            <div className="worddex-row">
              <div className="k">バトル</div>
              <div className="v">使用 {formatInt(item.used)} / 勝利 {formatInt(item.wins)}</div>
            </div>
          </div>
        </div>
      )}

      <div className="panel">
        <div className="panel-title">一覧</div>
        <div className="worddex-list">
          {list.map((x) => (
            <button key={x.v.id} type="button" className="worddex-item" onClick={() => setSelected(x.v.id)}>
              <div className="worddex-head">{x.v.head}</div>
              <div className="worddex-meta">
                <span className="muted">{x.v.meaningJa}</span>
                <span className="pct">{x.pct}%</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

