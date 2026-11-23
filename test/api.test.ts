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

test('GET / serves the dashboard while unknown routes return JSON 404', async () => {
  const dashboard = await fetch(`${baseUrl}/`);
  assert.equal(dashboard.status, 200);
  assert.match(dashboard.headers.get('content-type') ?? '', /^text\/html/);
  assert.match(await dashboard.text(), /<html\b/i);

  const missing = await fetch(`${baseUrl}/missing-route`);
  assert.equal(missing.status, 404);
  assert.deepEqual(await missing.json(), { error: 'Route not found' });
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

test('POST /evaluate returns JSON for malformed, oversized and unsupported request bodies', async () => {
  for (const [body, contentType, status, error] of [
    ['{"pitch":"private draft",', 'application/json', 400, 'Invalid JSON request body'],
    [JSON.stringify({ pitch: 'x'.repeat(110_000) }), 'application/json', 413, 'Request body too large'],
    ['{}', 'application/json; charset=iso-8859-1', 415, 'Unsupported request body encoding'],
  ] as const) {
    const res = await fetch(`${baseUrl}/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': contentType },
      body,
    });
    assert.equal(res.status, status);
    assert.deepEqual(await res.json(), { error });
  }
});

test('POST /evaluate falls back to rules and reports the error when the LLM fails', async () => {
  const failing = await listen((_req, res) => {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: { message: 'Incorrect API key provided: sk-proj-abc123****wxyz.' } }));
  });
  config.openAiApiKey = 'test-key';
  config.openAiBaseUrl = failing.url;
  try {
    const res = await post('/evaluate', README_EXAMPLE);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.meta.usedLLM, false);
    assert.match(body.meta.llmError, /401/);
    assert.match(body.meta.llmError, /Incorrect API key provided/);
    assert.doesNotMatch(body.meta.llmError, /abc123|wxyz/, 'key fragments are masked');
  } finally {
    config.openAiApiKey = '';
    failing.server.close();
  }
});

test('POST /evaluate labels fallback when the model returns an incomplete review', async () => {
  const incomplete = await listen((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ choices: [{ message: { content: '{}' } }] }));
  });
  config.openAiApiKey = 'test-key';
  config.openAiBaseUrl = incomplete.url;
  try {
    const res = await post('/evaluate', README_EXAMPLE);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.meta.usedLLM, false);
    assert.match(body.meta.llmError, /Incomplete opening evaluation/);
    assert.equal(body.evaluations.length, 5);
  } finally {
    config.openAiApiKey = '';
    incomplete.server.close();
  }
});
