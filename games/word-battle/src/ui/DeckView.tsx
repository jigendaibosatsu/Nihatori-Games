import type { CardDef } from '../game/types'
import type { AppState } from '../store/store'
import { addToDeck, autoBuildDeck, db, removeFromDeck } from '../store/store'
import { rarityColor, rarityLabelJa } from './format'

function cardPower(c: CardDef): number {
  const s = c.stats
  return (s ? s.atk + s.hp : 6) + (c.energyCost * -0.6)
}

export function DeckView(props: { state: AppState }) {
  const save = props.state.save
  const deck = save.decks[save.activeDeckId]
  if (!deck) return null

  const ownedIds = Object.keys(save.player.ownedCards).filter((id) => (save.player.ownedCards[id] ?? 0) > 0)
  const ownedCards = ownedIds
    .map((id) => db.byId[id])
    .filter((c): c is CardDef => !!c)
    .sort((a, b) => cardPower(b) - cardPower(a))

  return (
    <div className="screen">
      <div className="panel">
        <div className="row-between">
          <div>
            <div className="panel-title">デッキ</div>
            <div className="muted">20枚。手札から配置して戦う。</div>
          </div>
          <button type="button" className="btn btn-secondary" onClick={autoBuildDeck}>
            オート編成
          </button>
        </div>

        <div className="deck-count">
          {deck.cards.length}/20
        </div>

        <div className="deck-list">
          {deck.cards.map((id, idx) => {
            const c = db.byId[id]
            if (!c) return null
            const color = rarityColor(c.rarity)
            return (
              <div key={`${id}_${idx}`} className="deck-item" style={{ borderColor: color }}>
                <div className="deck-item-main">
                  <div className="deck-item-name">{c.nameJa}</div>
                  <div className="deck-item-sub">
                    {c.rarity}/{rarityLabelJa(c.rarity)} ・ コスト{c.energyCost}
                  </div>
                </div>
                <button type="button" className="btn btn-small" onClick={() => removeFromDeck(idx)}>
                  外す
                </button>
              </div>
            )
          })}
          {deck.cards.length === 0 && <div className="muted">カードを追加してください。</div>}
        </div>
      </div>

      <div className="panel">
        <div className="panel-title">所持カード</div>
        <div className="muted">追加したいカードをタップ。</div>
        <div className="collection-grid">
          {ownedCards.map((c) => {
            const owned = save.player.ownedCards[c.cardId] ?? 0
            const inDeck = deck.cards.filter((x) => x === c.cardId).length
            const canAdd = deck.cards.length < 20 && inDeck < owned
            const color = rarityColor(c.rarity)
            return (
              <button
                key={c.cardId}
                type="button"
                className={canAdd ? 'card-chip' : 'card-chip is-disabled'}
                onClick={() => addToDeck(c.cardId)}
                disabled={!canAdd}
                style={{ borderColor: color }}
              >
                <div className="chip-top">
                  <span className="chip-name">{c.nameJa}</span>
                  <span className="chip-cost">⚡{c.energyCost}</span>
                </div>
                <div className="chip-mid">
                  <span className="chip-rarity" style={{ color }}>
                    {c.rarity}
                  </span>
                  {c.stats && <span className="chip-stats">ATK {c.stats.atk} / HP {c.stats.hp}</span>}
                </div>
                <div className="chip-bottom">
                  {inDeck}/{owned}（デッキ/所持）
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

