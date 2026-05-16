export type AgentRole = 'vc' | 'market' | 'tech' | 'growth' | 'risk';
export type TranscriptSpeaker = AgentRole | 'moderator';

export interface StartupIdeaInput {
  title: string;
  pitch: string;
  notes?: string;
}

export interface NormalizedIdea {
  title: string;
  pitch: string;
  notes?: string;
  combinedText: string;
  signals: {
    hasProblem: boolean;
    hasSolution: boolean;
    hasTarget: boolean;
    hasRevenue: boolean;
    hasCompetition: boolean;
    hasPricing: boolean;
    hasAcquisition: boolean;
    hasWhyNow: boolean;
    hasTeam: boolean;
    hasMvp: boolean;
    isHardware: boolean;
    isRegulated: boolean;
    isAiNative: boolean;
    isB2b: boolean;
    isMarketplace: boolean;
    mentionsCommunity: boolean;
  };
}

export interface ScoreBreakdown {
  problemClarity: number;
  marketAttractiveness: number;
  feasibility: number;
  businessModelStrength: number;
  growthPotential: number;
  riskReadiness: number;
}

export interface AgentEvaluation {
  role: AgentRole;
  score: number;
  verdict: 'strong' | 'mixed' | 'weak';
  summary: string;
  strengths: string[];
  concerns: string[];
  recommendations: string[];
  scoreBreakdown: ScoreBreakdown;
}

export interface AgentDebateTurn {
  role: AgentRole;
  stance: 'bullish' | 'neutral' | 'bearish';
  agreesWith: AgentRole[];
  rebuttals: string[];
  revisedScore: number;
  closingNote: string;
}

export interface DebateTranscriptMessage {
  id: string;
  speaker: TranscriptSpeaker;
  phase: 'opening' | 'challenge' | 'response' | 'moderation' | 'verdict';
  addressedTo?: TranscriptSpeaker;
  text: string;
}

export interface ModeratorSummary {
  consensus: string[];
  disagreements: string[];
  finalReasoning: string;
  confidence: number;
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
  normalized: NormalizedIdea;
  evaluations: AgentEvaluation[];
  debate: AgentDebateTurn[];
  transcript: DebateTranscriptMessage[];
  moderator: ModeratorSummary;
  finalAssessment: FinalAssessment;
  meta: {
    usedLLM: boolean;
    generatedAt: string;
    llmError?: string;
  };
}
