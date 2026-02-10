import type { AppState } from '../store/store'
import { formatInt } from './format'

export function TopBar(props: { state: AppState }) {
  const p = props.state.save.player
  return (
    <div className="topbar">
      <div className="topbar-title">
        <div className="topbar-name">英単語カードバトル</div>
        <div className="topbar-sub">Fun first / Learning second</div>
      </div>
      <div className="topbar-stats">
        <div className="pill">
          <span className="pill-k">Lv</span>
          <span className="pill-v">{formatInt(p.level)}</span>
        </div>
        <div className="pill">
          <span className="pill-k">Gold</span>
          <span className="pill-v">{formatInt(p.gold)}</span>
        </div>
        <div className="pill">
          <span className="pill-k">Shard</span>
          <span className="pill-v">{formatInt(p.shards)}</span>
        </div>
      </div>
    </div>
  )
}

