import type { BattleState } from '../types'
import type { CardDatabase } from '../packs'
import { mulberry32 } from '../rng'
import { estimateCardPower, playCard } from './engine'

function lanesEmpty(lanes: Array<unknown | null>): number[] {
  const out: number[] = []
  for (let i = 0; i < lanes.length; i++) if (lanes[i] == null) out.push(i)
  return out
}

export function runEnemyTurn(params: { state: BattleState; db: CardDatabase }): void {
  const { state, db } = params
  if (state.phase !== 'enemy' || state.result) return

  const side = state.enemy
  const rng = mulberry32((state.seed + state.turn * 9973) >>> 0)
  // play up to 2 actions to keep match fast
  let actions = 0
  while (actions < 2) {
    actions++
    const playable = side.hand
      .map((id) => db.byId[id])
      .filter((c): c is NonNullable<typeof c> => !!c)
      .filter((c) => c.energyCost <= side.energy)

    if (playable.length === 0) break

    const empty = lanesEmpty(side.lanes)
    const units = playable.filter((c) => c.cardType === 'WORD')
    const spells = playable.filter((c) => c.cardType !== 'WORD')

    if (empty.length > 0 && units.length > 0) {
      const best = units.sort((a, b) => estimateCardPower(b) - estimateCardPower(a))[0]!
      const lane = empty[Math.floor(rng() * empty.length)] ?? 0
      playCard({ state, side: 'enemy', cardId: best.cardId, lane, db })
      continue
    }

    if (spells.length > 0) {
      const best = spells.sort((a, b) => estimateCardPower(b) - estimateCardPower(a))[0]!
      playCard({ state, side: 'enemy', cardId: best.cardId, lane: 1, db })
      continue
    }

    break
  }
}

