import test from 'node:test';
import assert from 'node:assert/strict';
import { fuse } from '../src/verdict.js';
import { updateTallies, slotSeries, daySeries, uptime, SLOT_MS } from '../src/state.js';

const web = (ok) => ({ label: 'site', core: true, ok, code: ok ? 200 : 0, ms: 100, note: ok ? 'reachable' : 'timed out' });
const feed = (state) => ({ ok: true, state, issues: [], incidents: [] });
const p = { slug: 'x' };

test('healthy feed and healthy probe is operational', () => {
  assert.equal(fuse(p, feed('operational'), [web(true)]).status, 'operational');
});

test('a single failed probe is not enough to react', () => {
  const prev = { seenOk: { site: true }, fails: 0 };
  const r = fuse(p, feed('operational'), [web(false)], prev);
  assert.equal(r.status, 'operational');
  assert.equal(r.fails, 1);
});

test('two failed probes with a healthy feed: degraded, never down', () => {
  let prev = { seenOk: { site: true }, fails: 0 };
  for (let i = 0; i < 6; i++) {
    const r = fuse(p, feed('operational'), [web(false)], prev);
    prev = r;
    if (i >= 1) assert.equal(r.status, 'degraded', `run ${i}`);
  }
});

test('no feed: two misses degraded, three misses down, recovery resets', () => {
  let prev = { seenOk: { site: true } };
  const runs = [false, false, false].map(() => (prev = fuse(p, null, [web(false)], prev)).status);
  assert.deepEqual(runs, ['operational', 'degraded', 'outage']);
  assert.equal(fuse(p, null, [web(true)], prev).status, 'operational');
  assert.equal(fuse(p, null, [web(true)], prev).fails, 0);
});

test('a probe that has never succeeded is treated as blocked, not as an outage', () => {
  let prev = {};
  let r;
  for (let i = 0; i < 5; i++) r = prev = fuse(p, feed('operational'), [web(false)], prev);
  assert.equal(r.status, 'operational');
  assert.deepEqual(r.blocked, ['site']);
  // With no feed either, there is nothing usable: unknown, not down.
  let q = {};
  for (let i = 0; i < 5; i++) r = q = fuse(p, null, [web(false)], q);
  assert.equal(r.status, 'unknown');
});

test('feed outage wins; feed state flows through', () => {
  assert.equal(fuse(p, feed('outage'), [web(true)]).status, 'outage');
  assert.equal(fuse(p, feed('degraded'), [web(true)]).status, 'degraded');
});

test('an unreadable feed falls back to the probe', () => {
  assert.equal(fuse(p, { ok: false, error: 'HTTP 403' }, [web(true)]).status, 'operational');
});

test('non-core probes never change the verdict', () => {
  const info = { ...web(false), core: false };
  const prev = { seenOk: { site: true }, fails: 5 };
  assert.equal(fuse(p, feed('operational'), [web(true), info], prev).status, 'operational');
});

test('tallies: slots keep the worst severity and prune; unknown records nothing', () => {
  const t0 = Date.UTC(2026, 9, 6, 12, 0, 0);
  let s = updateTallies({}, 'operational', t0);
  s = updateTallies(s, 'degraded', t0 + 60_000);
  s = updateTallies(s, 'operational', t0 + 120_000);
  const idx = Math.floor(t0 / SLOT_MS);
  assert.equal(s.slots[idx], 1);
  assert.deepEqual(s.days['2026-10-06'], [2, 3]);
  const before = JSON.stringify(s);
  assert.equal(JSON.stringify(updateTallies(s, 'unknown', t0 + 180_000)), before);
  const later = updateTallies(s, 'operational', t0 + 25 * 3600_000);
  assert.equal(later.slots[idx], undefined);
});

test('series and uptime', () => {
  const now = Date.UTC(2026, 9, 6, 12, 0, 0);
  const s = updateTallies({}, 'outage', now);
  const series = slotSeries(s.slots, now);
  assert.equal(series.length, 96);
  assert.equal(series[95], 2);
  assert.equal(series[0], null);
  const days = daySeries(s.days, now);
  assert.equal(days.length, 30);
  assert.deepEqual(days[29], { day: '2026-10-06', ok: 0, total: 1 });
  assert.equal(uptime({ a: [11, 11] }), null);
  assert.equal(uptime({ a: [99, 100], b: [100, 100] }), 99.5);
});
