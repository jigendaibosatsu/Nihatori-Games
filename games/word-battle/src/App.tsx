import './App.css'
import { useEffect } from 'react'
import { initStore, setTab } from './store/store'
import { useAppState } from './store/useStore'
import { TopBar } from './ui/TopBar'
import { TabNav } from './ui/TabNav'
import { QuizView } from './ui/QuizView'
import { DeckView } from './ui/DeckView'
import { BattleView } from './ui/BattleView'
import { WordDexView } from './ui/WordDexView'
import { ShopView } from './ui/ShopView'
import { PackModal } from './ui/PackModal'

export default function App() {
  const state = useAppState()

  useEffect(() => {
    initStore()
  }, [])

  return (
    <div className="app">
      <a href="/index.html" className="app-back">
        ← トップへ戻る
      </a>

      <TopBar state={state} />

      {state.tab === 'quiz' && <QuizView state={state} />}
      {state.tab === 'deck' && <DeckView state={state} />}
      {state.tab === 'battle' && <BattleView state={state} />}
      {state.tab === 'worddex' && <WordDexView state={state} />}
      {state.tab === 'shop' && <ShopView state={state} />}

      <TabNav tab={state.tab} onChange={setTab} />

      <PackModal state={state} />
    </div>
  )
}
