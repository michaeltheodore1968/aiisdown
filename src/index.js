import { PLATFORMS, BY_SLUG, pagePath } from './platforms.js';
import { HISTORY_LIMIT } from './util.js';
import { runChecks } from './run.js';
import { homePage, platformPage, apiStatus, apiService } from './render.js';
import { GUIDES, guidesIndex, guidePage, faqPage, aboutPage, privacyPage, termsPage, contactPage, notFoundPage } from './content.js';

const HTML = { 'content-type': 'text/html; charset=utf-8' };
const SHORT_CACHE = 'public, max-age=60';

async function loadStates(env) {
  const { results } = await env.DB.prepare('SELECT * FROM platform_state').all();
  const out = {};
  for (const r of results) {
    let data = {};
    try {
      data = JSON.parse(r.data);
    } catch {
      /* leave empty */
    }
    out[r.slug] = { status: r.status, since: r.since, checkedAt: r.checked_at, data };
  }
  return out;
}

const DAY_MS = 86400000;
const MATCH_MS = 10 * 60 * 1000; // how close in time a status change and a provider incident must be to count as the same event

// Totals over the last 30 days, computed in SQL so they are not capped at HISTORY_LIMIT rows.
async function loadStats(env, slug, now) {
  const since = now - 30 * DAY_MS;
  const [inc, ev] = await Promise.all([
    env.DB.prepare(
      `SELECT COUNT(*) AS n,
              SUM(resolved_at IS NULL) AS open,
              SUM(resolved_at IS NOT NULL) AS resolved,
              COALESCE(SUM(resolved_at - started_at), 0) AS total_ms,
              COALESCE(MAX(resolved_at - started_at), 0) AS longest_ms
         FROM incidents WHERE slug = ?1 AND started_at >= ?2`,
    )
      .bind(slug, since)
      .first(),
    env.DB.prepare(
      `SELECT COUNT(*) AS n,
              SUM(EXISTS (SELECT 1 FROM incidents i WHERE i.slug = e.slug AND i.started_at <= e.at + ?3
                          AND COALESCE(i.resolved_at, 9007199254740991) >= e.at - ?3)) AS matched
         FROM events e WHERE e.slug = ?1 AND e.at >= ?2 AND e.from_status = 'operational'`,
    )
      .bind(slug, since, MATCH_MS)
      .first(),
  ]);
  return {
    incidents: { n: inc?.n || 0, open: inc?.open || 0, resolved: inc?.resolved || 0, totalMs: inc?.total_ms || 0, longestMs: inc?.longest_ms || 0 },
    changes: { n: ev?.n || 0, matched: ev?.matched || 0 },
  };
}

async function loadExtras(env, slug, now) {
  const stats = loadStats(env, slug, now);
  const [inc, ev] = await Promise.all([
    env.DB.prepare(
      'SELECT title, impact, started_at, updated_at, resolved_at FROM incidents WHERE slug = ?1 ORDER BY (resolved_at IS NULL) DESC, started_at DESC LIMIT ?2',
    )
      .bind(slug, HISTORY_LIMIT)
      .all(),
    env.DB.prepare('SELECT from_status, to_status, at, summary FROM events WHERE slug = ?1 ORDER BY at DESC LIMIT ?2')
      .bind(slug, HISTORY_LIMIT)
      .all(),
  ]);
  return { incidents: inc.results, events: ev.results, stats: await stats };
}

function html(body, status = 200, extra = {}) {
  return new Response(body, { status, headers: { ...HTML, 'cache-control': SHORT_CACHE, ...extra } });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
      'cache-control': SHORT_CACHE,
    },
  });
}

// Pages built from live checks change every five minutes, so their lastmod is the latest check. Static pages carry none.
async function lastCheck(env) {
  try {
    const row = await env.DB.prepare('SELECT MAX(checked_at) AS t FROM platform_state').first();
    return row?.t ? new Date(row.t).toISOString().slice(0, 10) : null;
  } catch {
    return null;
  }
}

async function sitemap(env) {
  const site = env.SITE_URL.replace(/\/$/, '');
  const live = await lastCheck(env);
  const liveSet = new Set(['/', ...PLATFORMS.map((p) => pagePath(p.slug))]);
  const paths = [
    '/',
    ...PLATFORMS.map((p) => pagePath(p.slug)),
    '/guides',
    ...GUIDES.map((g) => `/guides/${g.id}`),
    '/faq',
    '/about',
    '/privacy',
    '/terms',
    '/contact',
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paths.map((p) => `<url><loc>${site}${p}</loc>${live && liveSet.has(p) ? `<lastmod>${live}</lastmod>` : ''}</url>`).join('\n')}\n</urlset>\n`;
  return new Response(xml, { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
}

async function route(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '') || '/';
  if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Method not allowed', { status: 405 });

  // Keep workers.dev and preview hosts out of search results.
  const canonicalHost = new URL(env.SITE_URL).host;
  const extra = url.host === canonicalHost ? {} : { 'x-robots-tag': 'noindex' };
  const now = Date.now();

  if (path === '/sitemap.xml') return await sitemap(env);

  let m;
  if (path === '/' || (m = path.match(/^\/is-([a-z-]+)-down$/)) || (m = path.match(/^\/api\/([a-z-]+)\.json$/))) {
    const states = await loadStates(env);
    // Brand new deployment: kick off the first run so the first visitor is not left waiting for the cron.
    if (!Object.keys(states).length) ctx.waitUntil(runChecks(env).catch((e) => console.error(e)));

    if (path === '/') return html(homePage(env, states, now), 200, extra);

    const slug = m[1];
    if (path.startsWith('/api/')) {
      if (slug === 'status') return json(apiStatus(env, states, now));
      const p = BY_SLUG[slug];
      return p ? json(apiService(env, p, states[slug])) : json({ error: 'unknown service' }, 404);
    }
    const p = BY_SLUG[slug];
    if (!p) return html(notFoundPage(env), 404, extra);
    return html(platformPage(env, p, states[slug], await loadExtras(env, slug, now), now), 200, extra);
  }

  const simple = { '/guides': guidesIndex, '/faq': faqPage, '/about': aboutPage, '/privacy': privacyPage, '/terms': termsPage, '/contact': contactPage };
  if (simple[path]) return html(simple[path](env), 200, { ...extra, 'cache-control': 'public, max-age=3600' });
  if ((m = path.match(/^\/guides\/([a-z-]+)$/))) {
    const g = guidePage(env, m[1]);
    if (g) return html(g, 200, { ...extra, 'cache-control': 'public, max-age=3600' });
  }
  return html(notFoundPage(env), 404, extra);
}

export default {
  async fetch(request, env, ctx) {
    try {
      return await route(request, env, ctx);
    } catch (e) {
      console.error('aiisdown: request failed', e);
      return new Response('Something went wrong on our side. Please try again in a minute.', { status: 500 });
    }
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runChecks(env, event.scheduledTime));
  },
};
