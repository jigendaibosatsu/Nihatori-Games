// Skill assignment from term (文字パターン)
const SKILLS = [
  { id: 'REPAIR', test: (t) => t.includes('re'), desc: 'Recover HP' },
  { id: 'NEGATE', test: (t) => /un|dis|non/.test(t), desc: 'Weaken enemy' },
  { id: 'BUILD', test: (t) => /tion|ment/.test(t), desc: 'Next cost -1' },
  { id: 'RUSH', test: (t) => (t.match(/[aeiou]/g)?.length ?? 0) >= t.length * 0.5, desc: 'Multi-hit' },
  { id: 'ARMOR', test: (t) => (t.match(/[bcdfghjklmnpqrstvwxyz]/gi)?.length ?? 0) >= t.length * 0.6, desc: 'Defense up' },
  { id: 'DRAW', test: (t) => t.length <= 5, desc: 'Draw 1 card' },
  { id: 'CRIT', test: (t) => t.length >= 10, desc: 'High crit rate' },
  { id: 'POISON', test: (t) => (t.match(/s/g)?.length ?? 0) >= 2, desc: 'DoT' },
  { id: 'BREAK', test: (t) => /x|z|k/.test(t), desc: 'Ignore defense' },
  { id: 'ECHO', test: (t) => /^(re|un|pre|dis|in|ex|con)[a-z]*\1/.test(t) || /(.)\1{2,}/.test(t), desc: 'Re-trigger' },
];

export function getSkillFromTerm(term) {
  const t = (term || '').toLowerCase();
  for (const s of SKILLS) {
    if (s.test(t)) return s;
  }
  return null;
}
