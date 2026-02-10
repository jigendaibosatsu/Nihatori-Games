// Card generation from Vocab (保存しない、戦闘時に計算)
import { xpToLevel } from './vocab';
import { getSkillFromTerm } from './skills';

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

export function vocabToCard(vocab) {
  const term = vocab.term || '';
  const len = term.length;
  const level = xpToLevel(vocab.xp ?? 0);

  const cost = clamp(Math.round(len / 3), 1, 7);
  const attack = clamp(len + level, 3, 20);
  const defense = clamp(Math.round(len * 0.6) + Math.floor(level / 2), 1, 15);

  const skill = getSkillFromTerm(term);

  return {
    vocabId: vocab.id,
    term,
    cost,
    attack,
    defense,
    skill: skill ? skill.id : null,
    skillDesc: skill ? skill.desc : null,
    level,
  };
}
