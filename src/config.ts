import dotenv from 'dotenv';

dotenv.config({ quiet: true });

export const config = {
  port: Number(process.env.PORT || 4000),
  openAiApiKey: process.env.OPENAI_API_KEY || '',
  openAiBaseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
  openAiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  debateRounds: Math.min(3, Math.max(1, Number(process.env.DEBATE_ROUNDS) || 2)),
};

export function hasOpenAi(): boolean {
  return Boolean(config.openAiApiKey);
}
