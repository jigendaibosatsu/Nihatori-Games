import type { FactorySlot, SaveData, SlimeInstance } from './types'
import { getSlimeDef, rarityFromTier } from './data'

const SAVE_KEY = 'infinite-slime-save-v1'

let state: SaveData = createDefaultSave()
const listeners: Array<() => void> = []

export function getState(): SaveData {
  return state
}

export function subscribe(fn: () => void): () => void {
  listeners.push(fn)
  return () => {
    const i = listeners.indexOf(fn)
    if (i >= 0) listeners.splice(i, 1)
  }
}

function emit() {
  listeners.forEach((l) => l())
}

export function setState(updater: (prev: SaveData) => SaveData) {
  state = updater(state)
  emit()
}

function createDefaultSave(): SaveData {
  const slots: FactorySlot[] = Array.from({ length: 9 }, (_, i) => ({
    id: `slot_${i}`,
    slimeInstanceId: null,
  }))
  return {
    version: 1,
    lastSavedAt: Date.now(),
    lastActiveAt: Date.now(),
    factory: {
      slots,
      unlockedSlots: 6,
    },
    slimes: {
      byInstanceId: {},
    },
    encyclopedia: {
      species: {},
    },
    currencies: {
      soft: 0,
    },
    stats: {
      totalMerges: 0,
      totalMutations: 0,
    },
  }
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw) as SaveData
    state = parsed
    emit()
  } catch {
    // ignore
  }
}

export function saveNow() {
  try {
    state.lastSavedAt = Date.now()
    localStorage.setItem(SAVE_KEY, JSON.stringify(state))
  } catch {
    // ignore
  }
}

export function tick(deltaSeconds: number) {
  // 簡易生産
  const rate = computeProductionRate()
  setState((prev) => ({
    ...prev,
    currencies: {
      ...prev.currencies,
      soft: prev.currencies.soft + rate * deltaSeconds,
    },
  }))
}

function computeProductionRate(): number {
  return state.factory.slots.reduce((sum, slot) => {
    if (!slot.slimeInstanceId) return sum
    const inst = state.slimes.byInstanceId[slot.slimeInstanceId]
    if (!inst) return sum
    const def = getSlimeDef(inst.speciesId)
    return sum + def.baseProduction * inst.level
  }, 0)
}

// --- spawn & merge ---

export function spawnBasicSlime() {
  setState((prev) => {
    const idx = prev.factory.slots.findIndex(
      (s, i) => i < prev.factory.unlockedSlots && s.slimeInstanceId === null,
    )
    if (idx === -1) return prev
    const inst = createInstance('slime_basic_01')
    const slots = prev.factory.slots.slice()
    slots[idx] = { ...slots[idx], slimeInstanceId: inst.id }
    const byInstanceId = { ...prev.slimes.byInstanceId, [inst.id]: inst }
    const encyclopedia = unlockSpecies(prev.encyclopedia.species, inst.speciesId, true)
    return {
      ...prev,
      factory: { ...prev.factory, slots },
      slimes: { byInstanceId },
      encyclopedia: { species: encyclopedia },
    }
  })
}

function createInstance(speciesId: string): SlimeInstance {
  const def = getSlimeDef(speciesId)
  const id = `inst_${Date.now()}_${Math.floor(Math.random() * 1e6)}`
  return {
    id,
    speciesId,
    level: 1,
    rarity: def.rarity,
  }
}

export function mergeSlots(aId: string, bId: string) {
  if (aId === bId) return
  setState((prev) => {
    const slots = prev.factory.slots.slice()
    const a = slots.find((s) => s.id === aId)
    const b = slots.find((s) => s.id === bId)
    if (!a || !b || !a.slimeInstanceId || !b.slimeInstanceId) return prev
    const instA = prev.slimes.byInstanceId[a.slimeInstanceId]
    const instB = prev.slimes.byInstanceId[b.slimeInstanceId]
    if (!instA || !instB) return prev
    if (instA.speciesId !== instB.speciesId) return prev

    const def = getSlimeDef(instA.speciesId)
    const nextId = def.nextId
    let resultSpeciesId = nextId ?? def.id
    let mutation = false
    // シンプル mutation: 稀に1 tier上にスキップ
    if (Math.random() < 0.1 && nextId) {
      const nextDef = getSlimeDef(nextId)
      if (nextDef.nextId) {
        resultSpeciesId = nextDef.nextId
        mutation = true
      }
    }

    const newInst: SlimeInstance = {
      id: instA.id,
      speciesId: resultSpeciesId,
      level: instA.level + 1,
      rarity: rarityFromTier(getSlimeDef(resultSpeciesId).tier),
    }

    const byInstanceId = { ...prev.slimes.byInstanceId }
    byInstanceId[newInst.id] = newInst
    delete byInstanceId[instB.id]

    const updatedSlots = slots.map((s) => {
      if (s.id === aId) return { ...s, slimeInstanceId: newInst.id }
      if (s.id === bId) return { ...s, slimeInstanceId: null }
      return s
    })

    const encyclopedia = unlockSpecies(prev.encyclopedia.species, resultSpeciesId, mutation)

    return {
      ...prev,
      factory: { ...prev.factory, slots: updatedSlots },
      slimes: { byInstanceId },
      encyclopedia: { species: encyclopedia },
      stats: {
        totalMerges: prev.stats.totalMerges + 1,
        totalMutations: prev.stats.totalMutations + (mutation ? 1 : 0),
      },
    }
  })
}

function unlockSpecies(
  current: Record<string, { seen: boolean; owned: boolean }>,
  speciesId: string,
  owned: boolean,
) {
  const prev = current[speciesId] ?? { seen: false, owned: false }
  return {
    ...current,
    [speciesId]: {
      seen: true,
      owned: prev.owned || owned,
    },
  }
}

