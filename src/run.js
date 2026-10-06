import { PLATFORMS } from './platforms.js';
import { fetchFeed, parseFeed, runProbe } from './checks.js';
import { fuse } from './verdict.js';
import { updateTallies } from './state.js';

const PRUNE_AFTER_MS = 90 * 86400000;

// One cron run: check everything in parallel, fuse the evidence, and write the
// results in a single batch. About ten row writes per run, well inside the
// free D1 allowance of 100,000 a day.
export async function runChecks(env, now = Date.now(), fetchImpl = fetch) {
  const feedJobs = new Map();
  for (const p of PLATFORMS) {
    if (p.feed && !feedJobs.has(p.feed.url)) feedJobs.set(p.feed.url, fetchFeed(p.feed, fetchImpl));
  }

  const results = await Promise.all(
    PLATFORMS.map(async (p) => {
      const [probes, raw] = await Promise.all([
        Promise.all(p.probes.map((pr) => runProbe(pr, fetchImpl))),
        p.feed ? feedJobs.get(p.feed.url) : null,
      ]);
      let feed = null;
      if (p.feed) {
        feed = raw.ok
          ? { ok: true, ...parseFeed(p.feed, raw.json) }
          : { ok: false, error: raw.error };
      }
      return { p, probes, feed };
    }),
  );

  // If every single check failed, the fault is probably on our side (or the
  // network between us and the world). Say nothing rather than report a
  // worldwide AI outage.
  const anySignal = results.some((r) => r.probes.some((x) => x.ok) || r.feed?.ok);
  if (!anySignal) {
    console.warn('aiisdown: no check succeeded anywhere; skipping this run');
    return { skipped: true };
  }

  const { results: stateRows } = await env.DB.prepare('SELECT * FROM platform_state').all();
  const prevBySlug = Object.fromEntries(stateRows.map((r) => [r.slug, { ...r, data: safeJson(r.data) }]));
  const { results: openRows } = await env.DB.prepare(
    'SELECT id, updated_at FROM incidents WHERE resolved_at IS NULL',
  ).all();
  const openIncidents = new Map(openRows.map((r) => [r.id, r.updated_at]));

  const stmts = [];
  const seenIncidentIds = new Set();
  const summary = [];

  for (const { p, probes, feed } of results) {
    const prev = prevBySlug[p.slug];
    const prevData = prev?.data || {};
    const verdict = fuse(p, feed, probes, prevData);
    const { slots, days } = updateTallies(prevData, verdict.status, now);

    const data = {
      slots,
      days,
      fails: verdict.fails,
      seenOk: verdict.seenOk,
      blocked: verdict.blocked,
      probes,
      feed: feed
        ? feed.ok
          ? { ok: true, state: feed.state, issues: feed.issues, description: feed.description }
          : { ok: false, error: feed.error }
        : null,
    };

    const changed = !prev || prev.status !== verdict.status;
    const since = changed ? now : prev.since;
    stmts.push(
      env.DB.prepare(
        `INSERT INTO platform_state (slug, status, since, checked_at, data) VALUES (?1, ?2, ?3, ?4, ?5)
         ON CONFLICT(slug) DO UPDATE SET status = ?2, since = ?3, checked_at = ?4, data = ?5`,
      ).bind(p.slug, verdict.status, since, now, JSON.stringify(data)),
    );

    if (prev && changed) {
      stmts.push(
        env.DB.prepare('INSERT INTO events (slug, from_status, to_status, at, summary) VALUES (?1, ?2, ?3, ?4, ?5)').bind(
          p.slug,
          prev.status,
          verdict.status,
          now,
          describeChange(p, verdict, feed, probes),
        ),
      );
    }

    if (feed?.ok) {
      for (const i of feed.incidents) {
        const id = `${p.slug}:${i.id}`;
        seenIncidentIds.add(id);
        if (openIncidents.get(id) === i.updatedAt) continue;
        stmts.push(
          env.DB.prepare(
            `INSERT INTO incidents (id, slug, title, impact, status, started_at, updated_at, resolved_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, NULL)
             ON CONFLICT(id) DO UPDATE SET title = ?3, impact = ?4, status = ?5, updated_at = ?7, resolved_at = NULL`,
          ).bind(id, p.slug, i.title, i.impact, i.status, i.startedAt, i.updatedAt),
        );
      }
    }
    summary.push(`${p.slug}=${verdict.status}`);
  }

  // An open incident that vanished from a feed we read successfully has resolved.
  const readable = new Set(results.filter((r) => r.feed?.ok).map((r) => r.p.slug));
  for (const id of openIncidents.keys()) {
    if (!seenIncidentIds.has(id) && readable.has(id.split(':')[0])) {
      stmts.push(env.DB.prepare('UPDATE incidents SET resolved_at = ?2 WHERE id = ?1').bind(id, now));
    }
  }

  // Housekeeping, once a day.
  const d = new Date(now);
  if (d.getUTCHours() === 3 && d.getUTCMinutes() < 5) {
    const cutoff = now - PRUNE_AFTER_MS;
    stmts.push(env.DB.prepare('DELETE FROM events WHERE at < ?1').bind(cutoff));
    stmts.push(env.DB.prepare('DELETE FROM incidents WHERE resolved_at IS NOT NULL AND resolved_at < ?1').bind(cutoff));
  }

  await env.DB.batch(stmts);
  console.log(`aiisdown: ${summary.join(' ')}`);
  return { skipped: false, summary };
}

function describeChange(p, verdict, feed, probes) {
  const bits = [];
  if (feed?.ok && feed.state !== 'operational') {
    const names = feed.issues.map((i) => `${i.name} (${i.status})`).join(', ');
    bits.push(`${p.vendor} status page: ${names || feed.description || feed.state}`);
  }
  const bad = probes.filter((x) => x.core && !x.ok);
  if (bad.length) bits.push(`our check of ${bad.map((x) => x.label).join(', ')}: ${bad[0].note}`);
  if (!bits.length) bits.push('all checks passing');
  return bits.join('; ').slice(0, 400);
}

function safeJson(s) {
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}
