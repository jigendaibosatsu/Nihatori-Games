import { useState } from 'react'
import type { AppState } from '../store/store'
import { watchAdStub } from '../store/store'
import { formatInt } from './format'

export function ShopView(props: { state: AppState }) {
  const [busy, setBusy] = useState(false)
  const gold = props.state.save.player.gold

  const onRewarded = async () => {
    if (busy) return
    setBusy(true)
    try {
      await watchAdStub()
      // MVP: pack doubling is offered in PackModal. Here we just show the loop.
      alert('広告を見ました！（MVPスタブ）\n次のクイズ正解で「2倍でもらう」を押してね。')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="screen">
      <div className="panel">
        <div className="panel-title">ショップ（MVP）</div>
        <div className="muted">収益導線は“骨組みだけ”先に置く。</div>
        <div className="muted" style={{ marginTop: 6 }}>
          所持Gold: {formatInt(gold)}
        </div>
      </div>

      <div className="panel">
        <div className="panel-title">リワード広告</div>
        <div className="muted">報酬2倍でドーパミンを加速。</div>
        <button type="button" className="btn" disabled={busy} onClick={onRewarded}>
          広告を見てボーナス（スタブ）
        </button>
      </div>

      <div className="panel">
        <div className="panel-title">パック購入（UIのみ）</div>
        <div className="shop-grid">
          <div className="shop-item">
            <div className="shop-name">学習パック</div>
            <div className="muted">¥120</div>
            <button type="button" className="btn btn-secondary" onClick={() => alert('MVPでは未実装')}>
              購入
            </button>
          </div>
          <div className="shop-item">
            <div className="shop-name">文明パック</div>
            <div className="muted">¥480</div>
            <button type="button" className="btn btn-secondary" onClick={() => alert('MVPでは未実装')}>
              購入
            </button>
          </div>
          <div className="shop-item">
            <div className="shop-name">イベントパック</div>
            <div className="muted">¥1,200</div>
            <button type="button" className="btn btn-secondary" onClick={() => alert('MVPでは未実装')}>
              購入
            </button>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-title">サブスク（月額）</div>
        <div className="muted">広告なし・学習分析・毎日ボーナス（将来）。</div>
        <button type="button" className="btn btn-secondary" onClick={() => alert('MVPでは未実装')}>
          加入する（UIのみ）
        </button>
      </div>
    </div>
  )
}

