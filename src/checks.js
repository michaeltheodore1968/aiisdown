// Fetching and parsing. Everything here takes `fetchImpl` so tests can feed it
// recorded responses instead of touching the network.

export const UA =
  'Mozilla/5.0 (compatible; aiisdown-status-check/1.0; +https://aiisdown.com/guides/how-we-check)';
const TIMEOUT_MS = 8000;

// What an unauthenticated GET can tell us. A 401 or 403 means the service
// answered, which is the point; many of these sites sit behind bot protection
// and will refuse a script, so a refusal is not an outage.
export function classifyStatus(code) {
  if (code >= 500) return { ok: false, note: `server error ${code}` };
  if (code === 401) return { ok: true, note: 'reachable (sign-in required)' };
  if (code === 403) return { ok: true, note: 'reachable (bot protection)' };
  if (code === 429) return { ok: true, note: 'reachable (rate limited)' };
  return { ok: true, note: 'reachable' };
}

export async function runProbe(probe, fetchImpl = fetch) {
  const t0 = Date.now();
  const base = { label: probe.label, url: probe.url, core: !!probe.core };
  try {
    const res = await fetchImpl(probe.url, {
      method: 'GET',
      redirect: 'manual',
      headers: { 'user-agent': UA, accept: '*/*' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const ms = Date.now() - t0;
    try {
      await res.body?.cancel();
    } catch {
      /* body already closed */
    }
    return { ...base, code: res.status, ms, ...classifyStatus(res.status) };
  } catch (e) {
    const timedOut = e?.name === 'TimeoutError' || e?.name === 'AbortError';
    return { ...base, ok: false, code: 0, ms: Date.now() - t0, note: timedOut ? 'timed out' : 'connection failed' };
  }
}

export async function fetchFeed(feed, fetchImpl = fetch) {
  try {
    const res = await fetchImpl(feed.url, {
      headers: { 'user-agent': UA, accept: 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    return { ok: true, json: await res.json() };
  } catch (e) {
    return { ok: false, error: e?.name === 'TimeoutError' ? 'timed out' : 'could not be read' };
  }
}

const COMPONENT_RANK = {
  operational: 0,
  under_maintenance: 0,
  degraded_performance: 1,
  partial_outage: 1,
  major_outage: 2,
};
const COMPONENT_LABEL = {
  degraded_performance: 'degraded',
  partial_outage: 'partial outage',
  major_outage: 'major outage',
};
const INDICATOR_STATE = { none: 'operational', minor: 'degraded', major: 'outage', critical: 'outage' };

const parseTime = (s) => {
  const t = Date.parse(s);
  return Number.isFinite(t) ? t : null;
};

// Atlassian Statuspage format, also served by incident.io and Instatus.
export function parseStatuspage(cfg, json) {
  const include = cfg.include ? new Set(cfg.include) : null;
  const all = (json.components || []).filter((c) => !c.group);
  const scoped = include ? all.filter((c) => include.has(c.name)) : all;

  const issues = scoped
    .filter((c) => (COMPONENT_RANK[c.status] ?? 0) > 0)
    .map((c) => ({ name: c.name, status: COMPONENT_LABEL[c.status] || c.status }));

  let state;
  if (scoped.length === 0) {
    // Nothing matched: fall back to the page-wide indicator.
    state = INDICATOR_STATE[json.status?.indicator] ?? 'operational';
  } else {
    const majors = scoped.filter((c) => c.status === 'major_outage');
    const coreDown = cfg.core
      ? scoped.some((c) => cfg.core.includes(c.name) && c.status === 'major_outage')
      : majors.length >= Math.ceil(scoped.length / 2);
    state = coreDown ? 'outage' : issues.length ? 'degraded' : 'operational';
  }

  const incidents = [];
  for (const i of json.incidents || []) {
    const names = Array.isArray(i.components) ? i.components.map((c) => c.name) : null;
    let relevant;
    if (!include) relevant = true;
    else if (names) relevant = names.some((n) => include.has(n));
    else relevant = cfg.incidents !== 'info' ? true : 'info';
    if (!relevant) continue;
    incidents.push({
      id: String(i.id),
      title: String(i.name || 'Incident'),
      impact: i.impact || 'none',
      status: i.status || '',
      startedAt: parseTime(i.created_at) ?? Date.now(),
      updatedAt: parseTime(i.updated_at) ?? Date.now(),
      info: relevant === 'info',
    });
  }

  // An open incident that is not yet being monitored for recovery keeps the
  // verdict at "having issues" even if the components have not caught up.
  const live = incidents.some((i) => !i.info && i.status !== 'monitoring' && i.impact !== 'none');
  if (state === 'operational' && live) state = 'degraded';

  return { state, issues, incidents, description: json.status?.description || '' };
}

// Google Cloud's incident list; we keep only open incidents that mention Gemini
// or Vertex AI. A regional incident is reported as "having issues", never "down".
export function parseGcp(cfg, list) {
  const incidents = [];
  for (const i of Array.isArray(list) ? list : []) {
    if (i.end) continue;
    const products = (i.affected_products || []).map((p) => p.title).join(' ');
    if (!cfg.match.test(`${i.service_name || ''} ${products}`)) continue;
    incidents.push({
      id: String(i.id),
      title: String(i.external_desc || i.service_name || 'Google Cloud incident').slice(0, 200),
      impact: i.severity || 'low',
      status: i.status_impact || 'investigating',
      startedAt: parseTime(i.begin) ?? Date.now(),
      updatedAt: parseTime(i.modified) ?? Date.now(),
      info: false,
    });
  }
  return {
    state: incidents.length ? 'degraded' : 'operational',
    issues: [],
    incidents,
    description: incidents.length ? 'Open Google Cloud incident' : 'No open Gemini or Vertex AI incidents',
  };
}

export function parseFeed(cfg, json) {
  if (cfg.type === 'gcp') return parseGcp(cfg, json);
  return parseStatuspage(cfg, json);
}
