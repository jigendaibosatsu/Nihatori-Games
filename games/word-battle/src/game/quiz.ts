import type { VocabEntry } from './types'
import { mulberry32, pickOne, shuffleInPlace } from './rng'

export interface QuizQuestion {
  id: string
  prompt: string // English word
  choices: Array<{ id: string; label: string; isCorrect: boolean }>
  vocabId: string
}

export function makeQuizQuestion(vocab: VocabEntry[], seed: number): QuizQuestion {
  const rng = mulberry32(seed)
  const target = pickOne(rng, vocab)

  const distractors: VocabEntry[] = []
  const maxTry = 200
  let tries = 0
  while (distractors.length < 3 && tries < maxTry) {
    tries++
    const v = pickOne(rng, vocab)
    if (v.id === target.id) continue
    if (distractors.some((d) => d.meaningJa === v.meaningJa)) continue
    distractors.push(v)
  }

  const choices = [
    { id: target.id, label: target.meaningJa, isCorrect: true },
    ...distractors.map((d) => ({ id: d.id, label: d.meaningJa, isCorrect: false })),
  ]
  shuffleInPlace(rng, choices)

  return {
    id: `q_${target.id}_${seed}`,
    prompt: target.head,
    choices,
    vocabId: target.id,
  }
}

