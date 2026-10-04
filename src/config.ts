import dotenv from 'dotenv';

dotenv.config({ quiet: true });

export const config = {
  port: Number(process.env.PORT || 4000),
  openAiApiKey: process.env.OPENAI_API_KEY || '',
  openAiBaseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
  openAiModel: process.env.OPENAI_MODEL || 'gpt-5.4-mini',
  // Optional: GPT-5-family models reject any temperature but the default and
  // accept a reasoning effort; older models are the other way round.
  temperature: process.env.OPENAI_TEMPERATURE ? Number(process.env.OPENAI_TEMPERATURE) : undefined,
  reasoningEffort: process.env.OPENAI_REASONING_EFFORT || undefined,
  debateRounds: Math.min(3, Math.max(1, Number(process.env.DEBATE_ROUNDS) || 2)),
};

export function hasOpenAi(): boolean {
  return Boolean(config.openAiApiKey);
}
