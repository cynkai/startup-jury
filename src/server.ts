import cors from 'cors';
import express from 'express';

import { config, hasOpenAi } from './config.js';
import { evaluateWithFallback } from './fallbackEvaluator.js';
import { evaluateWithLLM } from './llmEvaluator.js';
import { startupIdeaSchema } from './schema.js';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'startup-jury-backend', mode: hasOpenAi ? 'llm' : 'fallback' });
});

app.get('/agents', (_req, res) => {
  res.json({
    agents: [
      { role: 'vc', name: 'VC Agent', focus: 'investment attractiveness, moat, scalability, and fundability' },
      { role: 'market', name: 'Market Agent', focus: 'customer pain, market demand, timing, and competition' },
      { role: 'tech', name: 'Tech Agent', focus: 'technical feasibility, MVP scope, execution complexity, and defensibility' },
      { role: 'growth', name: 'Growth Agent', focus: 'go-to-market strategy, retention, distribution, and monetization' },
      { role: 'risk', name: 'Risk Agent', focus: 'regulatory, operational, adoption, trust, and failure risks' },
    ],
    moderator: { role: 'moderator', name: 'Moderator Agent', focus: 'synthesize consensus, disagreements, and final investment reasoning' },
  });
});

app.post('/evaluate', async (req, res) => {
  const parsed = startupIdeaSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'Invalid request body',
      details: parsed.error.flatten(),
    });
  }

  try {
    const result = hasOpenAi
      ? await evaluateWithLLM(parsed.data)
      : evaluateWithFallback(parsed.data);

    return res.json(result);
  } catch (error) {
    const fallbackResult = evaluateWithFallback(parsed.data);
    return res.status(200).json({
      ...fallbackResult,
      meta: {
        ...fallbackResult.meta,
        llmError: error instanceof Error ? error.message : 'Unknown LLM error',
      },
    });
  }
});

app.listen(config.port, () => {
  console.log(`Startup Jury backend listening on http://localhost:${config.port}`);
});
