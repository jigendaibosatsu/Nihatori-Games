import type { TabId } from '../store/store'

export function TabNav(props: { tab: TabId; onChange: (t: TabId) => void }) {
  const items: Array<{ id: TabId; label: string }> = [
    { id: 'quiz', label: 'クイズ' },
    { id: 'deck', label: 'デッキ' },
    { id: 'battle', label: 'バトル' },
    { id: 'worddex', label: '図鑑' },
    { id: 'shop', label: 'ショップ' },
  ]

  return (
    <nav className="tabnav" aria-label="ナビゲーション">
      {items.map((it) => (
        <button
          key={it.id}
          type="button"
          className={props.tab === it.id ? 'tabnav-btn is-active' : 'tabnav-btn'}
          onClick={() => props.onChange(it.id)}
        >
          {it.label}
        </button>
      ))}
    </nav>
  )
}

