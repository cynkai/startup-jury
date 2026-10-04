import assert from 'node:assert/strict';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { after, before, test } from 'node:test';

import { config } from '../src/config.js';
import { createApp } from '../src/server.js';

let server: http.Server;
let baseUrl: string;

const README_EXAMPLE = {
  title: 'PawWalk',
  pitch:
    'A mobile service that matches busy pet owners with verified neighbourhood dog walkers, with live route and photo sharing.',
  notes: '20% commission. First city: Seoul. Partner with pet cafes to recruit walkers.',
};

function listen(app: http.RequestListener): Promise<{ server: http.Server; url: string }> {
  return new Promise((resolve) => {
    const s = http.createServer(app).listen(0, '127.0.0.1', () => {
      resolve({ server: s, url: `http://127.0.0.1:${(s.address() as AddressInfo).port}` });
    });
  });
}

function post(path: string, body: unknown) {
  return fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

before(async () => {
  config.openAiApiKey = '';
  ({ server, url: baseUrl } = await listen(createApp()));
});

after(() => {
  server.close();
});

test('GET /health reports fallback mode without a key', async () => {
  const res = await fetch(`${baseUrl}/health`);
  assert.equal(res.status, 200);
  assert.equal((await res.json()).mode, 'fallback');
});

test('GET /agents and /scenarios list reviewers and presets', async () => {
  const agents = await (await fetch(`${baseUrl}/agents`)).json();
  assert.deepEqual(agents.agents.map((a: { role: string }) => a.role), ['vc', 'market', 'tech', 'growth', 'risk']);
  const scenarios = await (await fetch(`${baseUrl}/scenarios`)).json();
  assert.ok(scenarios.scenarios.length >= 3);
});

test('POST /evaluate accepts the README example', async () => {
  const res = await post('/evaluate', README_EXAMPLE);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.meta.usedLLM, false);
  assert.ok(['invest', 'watch', 'pass'].includes(body.finalAssessment.investmentVerdict));
});

test('POST /evaluate rejects an invalid body with 400', async () => {
  const res = await post('/evaluate', { title: 'X', pitch: 'short' });
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.ok(body.details.fieldErrors.title);
  assert.ok(body.details.fieldErrors.pitch);
});

test('POST /evaluate falls back to rules and reports the error when the LLM fails', async () => {
  const failing = await listen((_req, res) => {
    res.writeHead(500).end();
  });
  config.openAiApiKey = 'test-key';
  config.openAiBaseUrl = failing.url;
  try {
    const res = await post('/evaluate', README_EXAMPLE);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.meta.usedLLM, false);
    assert.match(body.meta.llmError, /500/);
  } finally {
    config.openAiApiKey = '';
    failing.server.close();
  }
});
