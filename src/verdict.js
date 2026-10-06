// Turning two kinds of evidence into one verdict.
//
// The rule that matters: our own probe alone can never mark a service "down"
// while a readable official feed says it is fine, and a probe that has never
// once succeeded is treated as blocked, not as an outage. Both guard against
// the classic status-checker bug of reporting a site as down because it
// refuses scripts.

export const SEVERITY = { operational: 0, degraded: 1, outage: 2 };
const worse = (a, b) => (SEVERITY[b] > SEVERITY[a] ? b : a);

export function fuse(platform, feed, probes, prev = {}) {
  const seenOk = { ...(prev.seenOk || {}) };
  for (const p of probes) if (p.ok) seenOk[p.label] = true;

  const failing = probes.filter((p) => p.core && !p.ok);
  const realFailing = failing.filter((p) => seenOk[p.label]);
  const blocked = failing.filter((p) => !seenOk[p.label]);
  const fails = realFailing.length ? (prev.fails || 0) + 1 : 0;

  const feedOk = !!(feed && feed.ok);
  const reasons = [];
  let status = 'operational';

  if (feedOk) {
    status = worse(status, feed.state);
    if (feed.state !== 'operational') reasons.push('feed');
  }

  if (realFailing.length && fails >= 2) {
    if (feedOk) {
      status = worse(status, 'degraded');
    } else {
      // No official feed to contradict us: two misses is a possible issue,
      // three in a row (about fifteen minutes) is an outage.
      status = worse(status, fails >= 3 ? 'outage' : 'degraded');
    }
    reasons.push('probe');
  }

  const coreProbes = probes.filter((p) => p.core);
  const nothingUsable = !feedOk && coreProbes.length > 0 && coreProbes.every((p) => !p.ok && !seenOk[p.label]);
  if (nothingUsable) status = 'unknown';

  return { status, fails, seenOk, blocked: blocked.map((p) => p.label), reasons };
}
