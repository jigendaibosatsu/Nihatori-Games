// Vocab utilities: level from xp, rarity, etc.

export function xpToLevel(xp) {
  if (xp <= 0) return 1;
  return Math.min(99, Math.floor(Math.sqrt(xp) / 2) + 1);
}

export const RARITIES = ['common', 'rare', 'epic', 'legend'];

export function assignRarity(xp) {
  const level = xpToLevel(xp);
  if (level >= 20) return 'legend';
  if (level >= 10) return 'epic';
  if (level >= 5) return 'rare';
  return 'common';
}

export function normalizeTerm(term) {
  return (term || '').toLowerCase().trim();
}

export function generateId() {
  return crypto.randomUUID?.() ?? `v${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
