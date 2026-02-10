import { useEffect, useMemo, useState } from 'react'
import type { AppState } from '../store/store'
import { claimPendingPack, db, watchAdStub } from '../store/store'
import { openLearningPack } from '../game/packs'
import { rarityColor, rarityLabelJa } from './format'

export function PackModal(props: { state: AppState }) {
  const pending = props.state.pendingPack
  const [phase, setPhase] = useState<'closed' | 'opening' | 'revealed'>('closed')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (pending) {
      setPhase('closed')
      setBusy(false)
    }
  }, [pending?.seed])

  const preview = useMemo(() => {
    if (!pending) return null
    const r = openLearningPack({ db, owned: props.state.save.player.ownedCards, seed: pending.seed })
    return db.byId[r.cardId] ?? null
  }, [pending, props.state.save.player.ownedCards])

  if (!pending || !preview) return null

  const onOpen = () => {
    if (phase !== 'closed') return
    setPhase('opening')
    window.setTimeout(() => setPhase('revealed'), 650)
  }

  const onClaim = async (doubled: boolean) => {
    if (busy) return
    setBusy(true)
    try {
      if (doubled) {
        const ok = await watchAdStub()
        if (!ok) return
      }
      claimPendingPack({ doubled })
    } finally {
      setBusy(false)
    }
  }

  const color = rarityColor(preview.rarity)

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="パック開封">
      <div className="modal">
        <div className="modal-title">学習パック</div>

        {phase === 'closed' && (
          <>
            <div className="pack pack-closed" onClick={onOpen} role="button" aria-label="開封する" tabIndex={0}>
              <div className="pack-top" />
              <div className="pack-body" />
              <div className="pack-shine" />
            </div>
            <div className="modal-sub">タップして開封</div>
          </>
        )}

        {phase === 'opening' && (
          <>
            <div className="pack pack-opening">
              <div className="pack-top" />
              <div className="pack-body" />
              <div className="pack-shine" />
            </div>
            <div className="modal-sub">…</div>
          </>
        )}

        {phase === 'revealed' && (
          <>
            <div className="card-reveal" style={{ borderColor: color }}>
              <div className="rarity-badge" style={{ background: color }}>
                {preview.rarity} / {rarityLabelJa(preview.rarity)}
              </div>
              <div className="card-name">{preview.nameJa}</div>
              {preview.subtitleJa && <div className="card-sub">{preview.subtitleJa}</div>}
              <div className="card-ability">{preview.ability.rulesTextJa}</div>
              <div className="card-flavor">“{preview.flavorJa}”</div>
            </div>

            <div className="modal-actions">
              <button type="button" className="btn" disabled={busy} onClick={() => onClaim(false)}>
                受け取る
              </button>
              <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => onClaim(true)}>
                2倍でもらう（広告）
              </button>
            </div>
            <div className="modal-note">※MVPでは広告はスタブです</div>
          </>
        )}
      </div>
    </div>
  )
}

