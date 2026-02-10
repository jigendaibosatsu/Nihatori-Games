import type { BattleSide, BattleState, BattleUnit, CardDef, Rarity, StatusEffect } from '../types'
import type { CardDatabase } from '../packs'
import { mulberry32, shuffleInPlace } from '../rng'

function now(): number {
  return Date.now()
}

function pushLog(state: BattleState, textJa: string): void {
  state.log.push({ t: now(), textJa })
  if (state.log.length > 80) state.log.shift()
}

function isWordUnit(card: CardDef): boolean {
  return card.cardType === 'WORD' && !!card.stats
}

function makeUnit(card: CardDef): BattleUnit {
  const atk = card.stats?.atk ?? 0
  const hp = card.stats?.hp ?? 1
  return {
    cardId: card.cardId,
    nameJa: card.nameJa,
    atk,
    hp,
    maxHp: hp,
    rarity: card.rarity,
    statuses: [],
  }
}

function drawCards(side: BattleSide, count: number): void {
  for (let i = 0; i < count; i++) {
    if (side.deck.length === 0) {
      // reshuffle discard into deck
      if (side.discard.length === 0) return
      side.deck = side.discard.splice(0, side.discard.length)
    }
    const top = side.deck.shift()
    if (!top) return
    side.hand.push(top)
  }
}

function addStatus(unit: BattleUnit, eff: StatusEffect): void {
  // merge same key
  const ex = unit.statuses.find((s) => s.key === eff.key)
  if (ex) {
    ex.amount = Math.max(ex.amount, eff.amount)
    ex.turns = Math.max(ex.turns, eff.turns)
  } else {
    unit.statuses.push({ ...eff })
  }
}

function getStatus(unit: BattleUnit, key: StatusEffect['key']): StatusEffect | undefined {
  return unit.statuses.find((s) => s.key === key)
}

function tickStatuses(unit: BattleUnit): void {
  for (const s of unit.statuses) s.turns -= 1
  unit.statuses = unit.statuses.filter((s) => s.turns > 0)
}

function applyPoison(unit: BattleUnit): number {
  const p = getStatus(unit, 'poison')
  if (!p) return 0
  unit.hp = Math.max(0, unit.hp - p.amount)
  return p.amount
}

function hasStun(unit: BattleUnit): boolean {
  const s = getStatus(unit, 'stun')
  return !!s && s.turns > 0
}

function effectiveAtk(unit: BattleUnit): number {
  const b = getStatus(unit, 'buffAtk')
  return Math.max(0, unit.atk + (b ? b.amount : 0))
}

function applyDamage(unit: BattleUnit, dmg: number): number {
  let remaining = dmg
  const sh = getStatus(unit, 'shield')
  if (sh && sh.amount > 0) {
    const used = Math.min(sh.amount, remaining)
    sh.amount -= used
    remaining -= used
  }
  if (remaining > 0) unit.hp = Math.max(0, unit.hp - remaining)
  return dmg
}

function removeDead(side: BattleSide): void {
  for (let i = 0; i < side.lanes.length; i++) {
    const u = side.lanes[i]
    if (u && u.hp <= 0) side.lanes[i] = null
  }
}

export function createBattle(params: {
  db: CardDatabase
  playerDeck: string[]
  enemyDeck: string[]
  seed: number
}): BattleState {
  const rng = mulberry32(params.seed)
  const pDeck = [...params.playerDeck]
  const eDeck = [...params.enemyDeck]
  shuffleInPlace(rng, pDeck)
  shuffleInPlace(rng, eDeck)

  const baseSide = (deck: string[]): BattleSide => ({
    hp: 20,
    energy: 3,
    maxEnergy: 8,
    deck,
    hand: [],
    discard: [],
    lanes: [null, null, null],
  })

  const state: BattleState = {
    id: `b_${params.seed}`,
    seed: params.seed >>> 0,
    turn: 1,
    maxTurns: 12,
    phase: 'player',
    player: baseSide(pDeck),
    enemy: baseSide(eDeck),
    lastActionAt: now(),
    log: [],
  }

  drawCards(state.player, 5)
  drawCards(state.enemy, 5)
  pushLog(state, 'バトル開始！')
  return state
}

export function canPlayCard(side: BattleSide, card: CardDef, lane: number): boolean {
  if (side.energy < card.energyCost) return false
  if (card.cardType === 'WORD') return lane >= 0 && lane <= 2 && side.lanes[lane] === null
  return true
}

function applyOnSummonAbility(params: {
  state: BattleState
  side: 'player' | 'enemy'
  lane: number
  card: CardDef
  unit: BattleUnit
  db: CardDatabase
}): void {
  const { state, side, lane, card, unit } = params
  const enemySide = side === 'player' ? state.enemy : state.player
  const facing = enemySide.lanes[lane]

  switch (card.ability.key) {
    case 'swift_strike': {
      const bonus = Number(card.ability.params.bonusAtk ?? 3)
      addStatus(unit, { key: 'buffAtk', amount: bonus, turns: Number(card.ability.params.turns ?? 1) })
      pushLog(state, `${unit.nameJa}：加速（攻撃+${bonus}）`)
      break
    }
    case 'shield_up': {
      const shield = Number(card.ability.params.shield ?? 4)
      addStatus(unit, { key: 'shield', amount: shield, turns: Number(card.ability.params.turns ?? 2) })
      pushLog(state, `${unit.nameJa}：シールド+${shield}`)
      break
    }
    case 'poison_touch': {
      const poison = Number(card.ability.params.poison ?? 1)
      if (facing) {
        addStatus(facing, { key: 'poison', amount: poison, turns: Number(card.ability.params.turns ?? 3) })
        pushLog(state, `${unit.nameJa}：毒${poison}付与`)
      }
      break
    }
    case 'stun_burst': {
      if (facing) {
        addStatus(facing, { key: 'stun', amount: 1, turns: 1 })
        pushLog(state, `${unit.nameJa}：気絶！`)
      }
      break
    }
    case 'heal_small': {
      const heal = Number(card.ability.params.heal ?? 3)
      unit.hp = Math.min(unit.maxHp, unit.hp + heal)
      pushLog(state, `${unit.nameJa}：回復+${heal}`)
      break
    }
    case 'draw_one': {
      const count = Number(card.ability.params.count ?? 1)
      const s = side === 'player' ? state.player : state.enemy
      drawCards(s, count)
      pushLog(state, `${side === 'player' ? 'あなた' : '相手'}：ドロー+${count}`)
      break
    }
    default:
      break
  }
}

function applySpell(params: {
  state: BattleState
  side: 'player' | 'enemy'
  lane: number
  card: CardDef
  db: CardDatabase
}): void {
  const { state, side, lane, card } = params
  const selfSide = side === 'player' ? state.player : state.enemy
  const enemySide = side === 'player' ? state.enemy : state.player

  switch (card.ability.key) {
    case 'swift_strike': {
      const u = selfSide.lanes[lane]
      if (!u) break
      const bonus = Number(card.ability.params.bonusAtk ?? 3)
      addStatus(u, { key: 'buffAtk', amount: bonus, turns: Number(card.ability.params.turns ?? 1) })
      pushLog(state, `${side === 'player' ? 'あなた' : '相手'}：加速（攻撃+${bonus}）`)
      break
    }
    case 'shield_up': {
      const shield = Number(card.ability.params.shield ?? 5)
      const turns = Number(card.ability.params.turns ?? 2)
      for (const u of selfSide.lanes) {
        if (!u) continue
        addStatus(u, { key: 'shield', amount: shield, turns })
      }
      pushLog(state, `${side === 'player' ? 'あなた' : '相手'}：全体シールド+${shield}`)
      break
    }
    case 'poison_touch': {
      const poison = Number(card.ability.params.poison ?? 2)
      const turns = Number(card.ability.params.turns ?? 3)
      const u = enemySide.lanes[lane]
      if (u) {
        addStatus(u, { key: 'poison', amount: poison, turns })
        pushLog(state, `${side === 'player' ? 'あなた' : '相手'}：毒${poison}`)
      } else {
        enemySide.hp = Math.max(0, enemySide.hp - poison)
        pushLog(state, `${side === 'player' ? 'あなた' : '相手'}：直撃-${poison}`)
      }
      break
    }
    case 'draw_one': {
      const count = Number(card.ability.params.count ?? 1)
      drawCards(selfSide, count)
      pushLog(state, `${side === 'player' ? 'あなた' : '相手'}：ドロー+${count}`)
      break
    }
    default:
      break
  }
}

export function playCard(params: { state: BattleState; side: 'player' | 'enemy'; cardId: string; lane: number; db: CardDatabase }): void {
  const { state, side, cardId, lane, db } = params
  const s = side === 'player' ? state.player : state.enemy
  const card = db.byId[cardId]
  if (!card) return
  if (!s.hand.includes(cardId)) return
  if (!canPlayCard(s, card, lane)) return

  s.energy -= card.energyCost
  s.hand.splice(s.hand.indexOf(cardId), 1)
  s.discard.push(cardId)

  if (isWordUnit(card)) {
    const unit = makeUnit(card)
    s.lanes[lane] = unit
    pushLog(state, `${side === 'player' ? 'あなた' : '相手'}：${card.nameJa}を配置`)
    applyOnSummonAbility({ state, side, lane, card, unit, db })
  } else {
    pushLog(state, `${side === 'player' ? 'あなた' : '相手'}：${card.nameJa}を使用`)
    applySpell({ state, side, lane, card, db })
  }
  state.lastActionAt = now()
}

function resolveCombat(state: BattleState): void {
  // poison tick before combat (adds tension)
  for (const side of [state.player, state.enemy]) {
    for (const u of side.lanes) {
      if (!u) continue
      const dmg = applyPoison(u)
      if (dmg > 0) pushLog(state, `${u.nameJa}：毒-${dmg}`)
    }
  }

  for (let lane = 0; lane < 3; lane++) {
    const p = state.player.lanes[lane]
    const e = state.enemy.lanes[lane]

    if (p && hasStun(p)) continue
    if (e && hasStun(e)) continue

    if (p && e) {
      const pAtk = effectiveAtk(p)
      const eAtk = effectiveAtk(e)
      applyDamage(p, eAtk)
      applyDamage(e, pAtk)
    } else if (p && !e) {
      const pAtk = effectiveAtk(p)
      state.enemy.hp = Math.max(0, state.enemy.hp - pAtk)
    } else if (e && !p) {
      const eAtk = effectiveAtk(e)
      state.player.hp = Math.max(0, state.player.hp - eAtk)
    }
  }

  removeDead(state.player)
  removeDead(state.enemy)

  for (const side of [state.player, state.enemy]) {
    for (const u of side.lanes) {
      if (!u) continue
      tickStatuses(u)
    }
  }
}

export function endTurn(params: { state: BattleState; side: 'player' | 'enemy' }): void {
  const { state, side } = params
  if (state.phase === 'ended') return

  if (side === 'player') {
    state.phase = 'enemy'
    pushLog(state, 'あなた：ターン終了')
    return
  }

  // enemy ended -> resolve a full turn
  pushLog(state, '相手：ターン終了')
  resolveCombat(state)

  // win check
  if (state.player.hp <= 0 && state.enemy.hp <= 0) state.result = { winner: 'draw' }
  else if (state.enemy.hp <= 0) state.result = { winner: 'player' }
  else if (state.player.hp <= 0) state.result = { winner: 'enemy' }

  if (!state.result && state.turn >= state.maxTurns) {
    if (state.player.hp > state.enemy.hp) state.result = { winner: 'player' }
    else if (state.enemy.hp > state.player.hp) state.result = { winner: 'enemy' }
    else state.result = { winner: 'draw' }
  }

  if (state.result) {
    state.phase = 'ended'
    pushLog(state, state.result.winner === 'draw' ? '引き分け！' : state.result.winner === 'player' ? '勝利！' : '敗北…')
    return
  }

  state.turn += 1
  state.phase = 'player'
  state.player.energy = Math.min(state.player.maxEnergy, state.player.energy + 1)
  state.enemy.energy = Math.min(state.enemy.maxEnergy, state.enemy.energy + 1)
  drawCards(state.player, 1)
  drawCards(state.enemy, 1)
  pushLog(state, `ターン${state.turn}`)
}

export function estimateCardPower(card: CardDef): number {
  const stats = card.stats
  const base = stats ? stats.atk * 1.2 + stats.hp : 8
  const rarityBonus: Record<Rarity, number> = { C: 0, U: 2, R: 5, SR: 9, UR: 14 }
  return base + rarityBonus[card.rarity] + (card.energyCost * -0.8)
}

