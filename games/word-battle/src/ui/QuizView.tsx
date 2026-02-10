import type { AppState } from '../store/store'
import { answerQuiz } from '../store/store'

export function QuizView(props: { state: AppState }) {
  const q = props.state.quiz.question
  const ans = props.state.quiz.answered
  const showFeedback = ans && props.state.quiz.lastAnsweredAt && Date.now() - props.state.quiz.lastAnsweredAt < 2500

  return (
    <div className="screen">
      <div className="panel quiz-panel">
        <div className="quiz-label">3〜10秒クイズ</div>
        <div className="quiz-prompt">{q.prompt}</div>
        <div className="quiz-choices">
          {q.choices.map((c) => (
            <button key={c.id} type="button" className="choice-btn" onClick={() => answerQuiz(c.id)}>
              {c.label}
            </button>
          ))}
        </div>

        {showFeedback && (
          <div className={ans.correct ? 'quiz-feedback ok' : 'quiz-feedback ng'}>
            {ans.correct ? '正解！ 報酬ゲット → パックへ' : '不正解… 次！'}
          </div>
        )}
        <div className="hint">
          学習は裏側に。まずは勝つために選ぶ。
        </div>
      </div>
    </div>
  )
}

