export function calcStateScore({ mood, energy, motivation } = {}) {
  if (!mood || !energy || !motivation) return null;
  return Math.round(((mood + energy + motivation) / 15) * 100);
}

export function scoreLabel(score) {
  if (score == null) return '未記録';
  if (score >= 85) return '絶好調';
  if (score >= 70) return '好調';
  if (score >= 55) return 'まずまず';
  if (score >= 40) return '低調';
  return '要休息';
}
