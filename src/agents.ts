import { AgentRole } from './types.js';

export const AGENT_DEFINITIONS: Record<AgentRole, { name: string; focus: string }> = {
  vc: {
    name: 'VC Agent',
    focus: 'investment attractiveness, moat, scalability, and fundability',
  },
  market: {
    name: 'Market Agent',
    focus: 'customer pain, market demand, timing, and competition',
  },
  tech: {
    name: 'Tech Agent',
    focus: 'technical feasibility, MVP scope, execution complexity, and defensibility',
  },
  growth: {
    name: 'Growth Agent',
    focus: 'go-to-market strategy, retention, distribution, and monetization',
  },
  risk: {
    name: 'Risk Agent',
    focus: 'regulatory, operational, adoption, trust, and failure risks',
  },
};

export const AGENT_ROLES = Object.keys(AGENT_DEFINITIONS) as AgentRole[];
