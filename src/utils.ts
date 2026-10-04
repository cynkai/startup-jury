import { AgentDebateTurn, AgentRole, InvestmentVerdict } from './types.js';

export function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function verdictFromScore(score: number): 'strong' | 'mixed' | 'weak' {
  if (score >= 75) return 'strong';
  if (score >= 50) return 'mixed';
  return 'weak';
}

export function investmentVerdictFromScore(score: number): InvestmentVerdict {
  if (score >= 78) return 'invest';
  if (score >= 55) return 'watch';
  return 'pass';
}

export function uniqueNonEmpty(items: Array<string | undefined>): string[] {
  return [...new Set(items.map((item) => item?.trim()).filter(Boolean) as string[])];
}

export function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/** Each agent's last turn, in the order agents first appear. */
export function finalPositions(debate: AgentDebateTurn[]): AgentDebateTurn[] {
  const last = new Map<AgentRole, AgentDebateTurn>();
  for (const turn of debate) last.set(turn.role, turn);
  return [...last.values()];
}
