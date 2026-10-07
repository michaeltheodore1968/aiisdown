import { PLATFORMS, BY_SLUG, pagePath } from './platforms.js';
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

async function loadExtras(env, slug) {
  const [inc, ev] = await Promise.all([
    env.DB.prepare(
      'SELECT title, impact, started_at, updated_at, resolved_at FROM incidents WHERE slug = ?1 ORDER BY (resolved_at IS NULL) DESC, started_at DESC LIMIT 8',
    )
      .bind(slug)
      .all(),
    env.DB.prepare('SELECT from_status, to_status, at, summary FROM events WHERE slug = ?1 ORDER BY at DESC LIMIT 8')
      .bind(slug)
      .all(),
  ]);
  return { incidents: inc.results, events: ev.results };
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

function sitemap(env) {
  const site = env.SITE_URL.replace(/\/$/, '');
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
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paths.map((p) => `<url><loc>${site}${p}</loc></url>`).join('\n')}\n</urlset>\n`;
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

  if (path === '/sitemap.xml') return sitemap(env);

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
    return html(platformPage(env, p, states[slug], await loadExtras(env, slug), now), 200, extra);
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
