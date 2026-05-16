export function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function verdictFromScore(score: number): 'strong' | 'mixed' | 'weak' {
  if (score >= 75) return 'strong';
  if (score >= 50) return 'mixed';
  return 'weak';
}

export function investmentVerdictFromScore(score: number): 'invest' | 'watch' | 'pass' {
  if (score >= 78) return 'invest';
  if (score >= 55) return 'watch';
  return 'pass';
}

export function uniqueNonEmpty(items: Array<string | undefined>): string[] {
  return [...new Set(items.map((item) => item?.trim()).filter(Boolean) as string[])];
}
