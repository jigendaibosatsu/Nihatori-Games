import './App.css'
import { useState } from 'react'
import { backToTitle, createInitialState, finishGame, startGame } from './game/fsm'

export default function App() {
  const [state, setState] = useState(createInitialState)

  return (
    <div className="app-root">
      <a href="/index.html" className="app-back">
        ← トップへ戻る
      </a>

      <div className="frame">
        {state.scene === 'TITLE' && (
          <>
            <div className="title-main">ミニゲーム テンプレート</div>
            <div className="title-sub">TITLE → MAIN → RESULT の最小FSM</div>
            <div className="btn-row">
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setState((prev) => startGame(prev))
                }}
              >
                ゲームを始める
              </button>
            </div>
            <div className="footer-hint">このテンプレートを各ゲームにコピーして使います。</div>
          </>
        )}

        {state.scene === 'MAIN' && (
          <>
            <div className="title-main">ゲーム本編（MAIN）</div>
            <div className="title-sub">ここに各ゲーム固有の画面を差し込みます。</div>
            <div className="btn-row">
              <button
                type="button"
                className="btn"
                onClick={() => {
                  // デモとしてランダムスコアを渡す
                  const score = Math.floor(Math.random() * 1000)
                  setState((prev) => finishGame(prev, score))
                }}
              >
                クリアしたことにする
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setState((prev) => backToTitle(prev))
                }}
              >
                タイトルへ戻る
              </button>
            </div>
            <div className="scene-label">実際の実装では、タイトルから渡された設定でゲームを開始します。</div>
          </>
        )}

        {state.scene === 'RESULT' && (
          <>
            <div className="title-main">リザルト（RESULT）</div>
            <div className="title-sub">スコア: {state.lastScore}</div>
            <div className="btn-row">
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setState((prev) => startGame(prev))
                }}
              >
                もう一度プレイ
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setState((prev) => backToTitle(prev))
                }}
              >
                タイトルへ戻る
              </button>
            </div>
            <div className="scene-label">各ゲームでは、ここでハイスコア保存や解放処理を行います。</div>
          </>
        )}
      </div>
    </div>
  )
}
