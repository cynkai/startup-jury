import cors from 'cors';
import express, { type ErrorRequestHandler } from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { AGENT_DEFINITIONS, AGENT_ROLES, MODERATOR_DEFINITION } from './agents.js';
import { hasOpenAi } from './config.js';
import { evaluateWithFallback } from './fallbackEvaluator.js';
import { evaluateWithLLM } from './llmEvaluator.js';
import { startupIdeaSchema } from './schema.js';
import { scenarioPresets } from './scenarios.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, '../public');

const sendError: ErrorRequestHandler = (error, _req, res, next) => {
  if (res.headersSent) return next(error);

  switch (error.status) {
    case 400:
      return res.status(400).json({ error: 'Invalid JSON request body' });
    case 413:
      return res.status(413).json({ error: 'Request body too large' });
    case 415:
      return res.status(415).json({ error: 'Unsupported request body encoding' });
    default:
      return res.status(500).json({ error: 'Internal server error' });
  }
};

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.static(publicDir));

  app.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'startup-jury-backend', mode: hasOpenAi() ? 'llm' : 'fallback' });
  });

  app.get('/agents', (_req, res) => {
    res.json({
      agents: AGENT_ROLES.map((role) => ({ role, ...AGENT_DEFINITIONS[role] })),
      moderator: MODERATOR_DEFINITION,
    });
  });

  app.get('/scenarios', (_req, res) => {
    res.json({ scenarios: scenarioPresets });
  });

  app.post('/evaluate', express.json(), async (req, res) => {
    const parsed = startupIdeaSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: parsed.error.flatten(),
      });
    }

    try {
      const result = hasOpenAi()
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

  app.use((_req, res) => {
    res.status(404).json({ error: 'Route not found' });
  });
  app.use(sendError);

  return app;
}
