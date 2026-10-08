import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { classifyStatus, parseStatuspage, parseGcp, runProbe, fetchFeed } from '../src/checks.js';
import { BY_SLUG } from '../src/platforms.js';

const fx = (n) => JSON.parse(readFileSync(new URL(`./fixtures/${n}.json`, import.meta.url)));

test('classifyStatus: refusals count as reachable, server errors do not', () => {
  for (const c of [200, 204, 301, 401, 403, 404, 429]) assert.equal(classifyStatus(c).ok, true, `status ${c}`);
  for (const c of [500, 502, 503, 520, 524]) assert.equal(classifyStatus(c).ok, false, `status ${c}`);
});

test('runProbe: maps responses, timeouts and network errors', async () => {
  const mk = (status) => async () => new Response(null, { status });
  assert.equal((await runProbe({ label: 'x', url: 'https://x/', core: true }, mk(403))).ok, true);
  assert.equal((await runProbe({ label: 'x', url: 'https://x/', core: true }, mk(502))).ok, false);
  const boom = async () => {
    throw new TypeError('fetch failed');
  };
  const r = await runProbe({ label: 'x', url: 'https://x/', core: true }, boom);
  assert.equal(r.ok, false);
  assert.equal(r.note, 'connection failed');
  const slow = async () => {
    const e = new Error('t');
    e.name = 'TimeoutError';
    throw e;
  };
  assert.equal((await runProbe({ label: 'x', url: 'https://x/', core: true }, slow)).note, 'timed out');
});

test('fetchFeed: a blocked feed reports an error instead of throwing', async () => {
  const blocked = async () => new Response('Just a moment', { status: 403 });
  assert.deepEqual(await fetchFeed({ url: 'https://x/' }, blocked), { ok: false, error: 'HTTP 403' });
});

test('statuspage: ChatGPT is judged on its own components, not the API ones', () => {
  const j = fx('openai');
  // Live fixture has API components degraded (Responses, Agents) but ChatGPT ones fine.
  const apiDegraded = j.components.some((c) => ['Responses', 'Agents'].includes(c.name) && c.status !== 'operational');
  const r = parseStatuspage(BY_SLUG.chatgpt.feed, j);
  if (apiDegraded) {
    assert.equal(r.issues.some((i) => ['Responses', 'Agents'].includes(i.name)), false);
  }
  // Page-wide incidents are shown but flagged as informational.
  for (const i of r.incidents) assert.equal(i.info, true);
});

test('statuspage: major outage of a core component is an outage', () => {
  const j = structuredClone(fx('claude'));
  j.components.find((c) => c.name === 'claude.ai').status = 'major_outage';
  const r = parseStatuspage(BY_SLUG.claude.feed, j);
  assert.equal(r.state, 'outage');
  assert.deepEqual(r.issues, [{ name: 'claude.ai', status: 'major outage' }]);
});

test('statuspage: a non-core major outage is only "degraded"', () => {
  const j = structuredClone(fx('claude'));
  j.components.find((c) => c.name === 'Claude Code').status = 'major_outage';
  assert.equal(parseStatuspage(BY_SLUG.claude.feed, j).state, 'degraded');
});

test('statuspage: partial outage means degraded, all green means operational', () => {
  const cursor = parseStatuspage(BY_SLUG.cursor.feed, fx('cursor'));
  assert.equal(cursor.state, 'degraded');
  assert.ok(cursor.issues.some((i) => i.name === 'Review Agents'));
  assert.equal(parseStatuspage(BY_SLUG.claude.feed, fx('claude')).state, 'operational');
});

test('statuspage: GitHub Copilot ignores the other GitHub components', () => {
  const j = structuredClone(fx('github'));
  j.components.find((c) => c.name === 'Actions').status = 'major_outage';
  const r = parseStatuspage(BY_SLUG['github-copilot'].feed, j);
  assert.equal(r.state, 'operational');
});

test('statuspage: an open incident with no component data still degrades a platform feed', () => {
  const j = structuredClone(fx('claude'));
  j.incidents = [{ id: 'a1', name: 'Elevated errors', status: 'investigating', impact: 'minor', created_at: '2026-10-06T10:00:00Z', updated_at: '2026-10-06T10:05:00Z' }];
  const r = parseStatuspage(BY_SLUG.claude.feed, j);
  assert.equal(r.state, 'degraded');
  assert.equal(r.incidents.length, 1);
  j.incidents[0].status = 'monitoring';
  assert.equal(parseStatuspage(BY_SLUG.claude.feed, j).state, 'operational');
});

test('statuspage: a Claude Console problem does not turn Claude amber', () => {
  const j = structuredClone(fx('claude'));
  const consoleName = 'Claude Console (platform.claude.com)';
  j.components = j.components.filter((c) => c.name !== consoleName);
  j.components.push({ id: 'console', name: consoleName, status: 'degraded_performance', group: false });
  j.incidents = [{ id: 'c1', name: 'Elevated errors on platform.claude.com', status: 'identified', impact: 'major', created_at: '2026-10-07T13:25:00Z', updated_at: '2026-10-07T17:28:00Z', components: [{ name: consoleName }] }];
  const r = parseStatuspage(BY_SLUG.claude.feed, j);
  assert.equal(r.state, 'operational');
  assert.deepEqual(r.issues, []);
  assert.equal(r.incidents.length, 0);
  // It is still reported, as a component we do not count.
  assert.deepEqual(r.excluded, [{ name: consoleName, status: 'degraded' }]);
});

test('gcp: only open Gemini or Vertex AI incidents count', () => {
  const list = fx('gcp');
  assert.equal(parseGcp(BY_SLUG.gemini.feed, list).state, 'operational');
  const open = [{ id: 'g1', begin: '2026-10-06T09:00:00+00:00', modified: '2026-10-06T09:10:00+00:00', external_desc: 'Gemini API elevated errors', service_name: 'Vertex Gemini API', severity: 'high', affected_products: [{ title: 'Vertex Gemini API' }] }];
  const r = parseGcp(BY_SLUG.gemini.feed, open);
  assert.equal(r.state, 'degraded');
  assert.equal(r.incidents[0].title, 'Gemini API elevated errors');
  open[0].end = '2026-10-06T10:00:00+00:00';
  assert.equal(parseGcp(BY_SLUG.gemini.feed, open).state, 'operational');
});
