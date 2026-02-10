import './App.css'
import { useEffect } from 'react'
import { useSyncExternalStore } from 'react'
import { getState, loadSave, saveNow, spawnBasicSlime, subscribe, tick, mergeSlots } from './game/store'
import { getSlimeDef } from './game/data'

function useSave() {
  return useSyncExternalStore(subscribe, getState, getState)
}

export default function App() {
  const save = useSave()

  useEffect(() => {
    loadSave()
    let last = performance.now()
    let frame: number
    const loop = (now: number) => {
      const dt = (now - last) / 1000
      last = now
      tick(dt)
      frame = requestAnimationFrame(loop)
    }
    frame = requestAnimationFrame(loop)
    const autosave = setInterval(saveNow, 10000)
    return () => {
      cancelAnimationFrame(frame)
      clearInterval(autosave)
    }
  }, [])

  return (
    <div className="app-root">
      <a href="/index.html" className="app-back">
        ← トップへ戻る
      </a>

      <div className="frame">
        <div className="title-main">Infinite Evolving Slime Factory</div>
        <div className="title-sub">スライムを合体させて、工場を進化させよう。</div>

        <div className="hud">
          通貨: {Math.floor(save.currencies.soft)} / マージ: {save.stats.totalMerges} / 変異:{' '}
          {save.stats.totalMutations}
        </div>

        <FactoryView />

        <div className="controls">
          <button type="button" className="btn" onClick={spawnBasicSlime}>
            スライムを投入
          </button>
        </div>
      </div>
    </div>
  )
}

function FactoryView() {
  const save = useSave()
  const { slots, unlockedSlots } = save.factory
  const gridCols = 3

  const handleSlotClick = (() => {
    let first: string | null = null
    return (slotId: string) => {
      if (first === null) {
        first = slotId
        return
      }
      mergeSlots(first, slotId)
      first = null
    }
  })()

  return (
    <div className="grid" style={{ gridTemplateColumns: `repeat(${gridCols}, 1fr)` }}>
      {slots.map((slot, idx) => {
        const inst = slot.slimeInstanceId ? save.slimes.byInstanceId[slot.slimeInstanceId] : null
        const locked = idx >= unlockedSlots
        const def = inst ? getSlimeDef(inst.speciesId) : null
        return (
          <button
            key={slot.id}
            type="button"
            className={locked ? 'cell locked' : inst ? 'cell filled' : 'cell'}
            onClick={() => {
              if (!locked) handleSlotClick(slot.id)
            }}
          >
            {locked ? '🔒' : inst ? def?.tier : '+'}
          </button>
        )
      })}
    </div>
  )
}

