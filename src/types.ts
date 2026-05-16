export type AgentRole = 'vc' | 'market' | 'tech' | 'growth' | 'risk';

export interface StartupIdeaInput {
  title: string;
  summary: string;
  targetCustomer?: string;
  problem?: string;
  solution?: string;
  revenueModel?: string;
  marketRegion?: string;
  competitors?: string[];
  stage?: 'idea' | 'prototype' | 'mvp' | 'launched';
}

export interface AgentEvaluation {
  role: AgentRole;
  score: number;
  verdict: 'strong' | 'mixed' | 'weak';
  summary: string;
  strengths: string[];
  concerns: string[];
  recommendations: string[];
}

export interface FinalAssessment {
  overallScore: number;
  investmentVerdict: 'invest' | 'watch' | 'pass';
  oneLiner: string;
  topStrengths: string[];
  topRisks: string[];
  nextActions: string[];
}

export interface EvaluationResponse {
  input: StartupIdeaInput;
  evaluations: AgentEvaluation[];
  finalAssessment: FinalAssessment;
  meta: {
    usedLLM: boolean;
    generatedAt: string;
  };
}
