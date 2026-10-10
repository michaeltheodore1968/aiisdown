import test from 'node:test';
import assert from 'node:assert/strict';
import { PLATFORMS, BY_SLUG } from '../src/platforms.js';
import { homePage, platformPage, apiStatus, adUnit } from '../src/render.js';
import { ABOUT } from '../src/about.js';
import { guidePage, GUIDES, aboutPage, contactPage, faqPage, privacyPage } from '../src/content.js';

const env = { SITE_URL: 'https://aiisdown.com', ADSENSE_CLIENT: '', ADSENSE_SLOT_TOP: '', ADSENSE_SLOT_INLINE: '', CONTACT_EMAIL: '', OPERATOR_NAME: '' };
const now = Date.UTC(2026, 9, 6, 12, 0, 0);
const state = (status, data = {}) => ({ status, since: now - 3600_000, checkedAt: now - 60_000, data });

test('home page: all fine', () => {
  const states = Object.fromEntries(PLATFORMS.map((p) => [p.slug, state('operational')]));
  const html = homePage(env, states, now);
  assert.match(html, /All 10 AI services we watch look up right now/);
  assert.match(html, /<link rel="canonical" href="https:\/\/aiisdown\.com\/">/);
  assert.equal((html.match(/class="tile"/g) || []).length, 10);
});

test('home page: names the services in trouble', () => {
  const states = Object.fromEntries(PLATFORMS.map((p) => [p.slug, state('operational')]));
  states.claude = state('outage');
  states.chatgpt = state('degraded');
  const html = homePage(env, states, now);
  assert.match(html, /ChatGPT and Claude are having problems right now/);
  assert.match(html, /class="hero bad"/);
});

test('layout carries the logo and a social card image', () => {
  const html = homePage(env, {}, now);
  assert.match(html, /<img class="brand-mark" src="\/logo-mark\.svg"/);
  assert.match(html, /og:image" content="https:\/\/aiisdown\.com\/og\.png"/);
  assert.match(html, /summary_large_image/);
});

test('home page renders before any data exists', () => {
  assert.match(homePage(env, {}, now), /Running our first checks/);
});

test('platform page: structured data parses and answers first', () => {
  const p = BY_SLUG.chatgpt;
  const html = platformPage(env, p, state('operational', { probes: [{ label: 'chatgpt.com', core: true, ok: true, ms: 120, note: 'reachable' }], feed: { ok: true, state: 'operational', issues: [] } }), { incidents: [], events: [] }, now);
  assert.match(html, /<h1>Is ChatGPT down right now\?<\/h1>/);
  assert.match(html, /ChatGPT looks up/);
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map((m) => JSON.parse(m[1]));
  assert.deepEqual(blocks.map((b) => b['@type']), ['WebPage', 'BreadcrumbList', 'FAQPage']);
});

test('platform page: says so when the provider reports problems we do not count', () => {
  const p = BY_SLUG.claude;
  const feed = { ok: true, state: 'operational', issues: [], excluded: [{ name: 'Claude Console (platform.claude.com)', status: 'degraded' }] };
  const html = platformPage(env, p, state('operational', { feed, probes: [{ label: 'claude.ai', core: true, ok: true, ms: 46, note: 'reachable' }] }), { incidents: [], events: [] }, now);
  assert.match(html, /reports no problems with the parts of Claude we count\./);
  assert.match(html, /problems with Claude Console \(platform\.claude\.com\) \(degraded\), which we do not count towards this verdict/);
  assert.match(html, /Claude looks up/);
  // Nothing extra when there is nothing to report.
  const clean = platformPage(env, p, state('operational', { feed: { ok: true, state: 'operational', issues: [], excluded: [] }, probes: [] }), { incidents: [], events: [] }, now);
  assert.match(clean, /reports no problems\./);
  assert.equal(clean.includes('do not count'), false);
});

test('every service has its own written content, with sources and no em dashes', () => {
  const clean = (s) => !/[—–]/.test(s);
  const seen = new Set();
  for (const p of PLATFORMS) {
    const a = ABOUT[p.slug];
    assert.ok(a, `${p.slug} has no written content`);
    assert.ok(a.intro.length >= 1 && a.sources.length >= 1, p.slug);
    for (const [, url] of a.sources) assert.match(url, /^https:\/\//, `${p.slug} source`);
    for (const t of [...a.intro, ...(a.parts || []).flat(), ...(a.errors || []).flat(), ...(a.faq || []).flat(), a.errorsIntro || '']) assert.ok(clean(t), `${p.slug}: dash in "${t.slice(0, 40)}"`);
    // Nothing is shared between services: each intro and each extra question is its own.
    for (const t of [...a.intro, ...(a.faq || []).map((f) => f[0])]) {
      assert.equal(seen.has(t), false, `${p.slug}: repeated text "${t.slice(0, 40)}"`);
      seen.add(t);
    }
    const html = platformPage(env, p, state('operational', {}), { incidents: [], events: [] }, now);
    assert.ok(html.includes(`How ${p.name} can fail`), p.slug);
    assert.ok(html.includes('rel="noopener">'), p.slug);
    const blocks = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map((m) => JSON.parse(m[1]));
    const faq = blocks.find((b) => b['@type'] === 'FAQPage');
    assert.equal(faq.mainEntity.length, 4 + (a.faq || []).length, p.slug);
  }
});

test('platform page: feed-supplied text is HTML-escaped everywhere', () => {
  const evil = '<img src=x onerror=alert(1)>';
  const p = BY_SLUG.claude;
  const html = platformPage(
    env,
    p,
    state('degraded', { feed: { ok: true, state: 'degraded', issues: [{ name: evil, status: 'partial outage' }] }, probes: [] }),
    { incidents: [{ title: evil, impact: 'minor', started_at: now - 1000, updated_at: now, resolved_at: null }], events: [{ from_status: 'operational', to_status: 'degraded', at: now, summary: evil }] },
    now,
  );
  assert.equal(html.includes(evil), false);
  assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));
});

test('platform page: honest wording when there is no feed', () => {
  const html = platformPage(env, BY_SLUG.grok, state('operational', { probes: [{ label: 'grok.com', core: true, ok: true, ms: 90, note: 'reachable' }] }), { incidents: [], events: [] }, now);
  assert.match(html, /relies on our own checks/);
});

test('api: shape and unknown services', () => {
  const j = apiStatus(env, {}, now);
  assert.equal(j.services.length, 10);
  assert.equal(j.services[0].status, 'unknown');
});

test('ads render only when configured', () => {
  assert.equal(adUnit(env, 'abc'), '');
  assert.match(adUnit({ ...env, ADSENSE_CLIENT: 'ca-pub-1' }, '123'), /data-ad-slot="123"/);
  // Google only allows the labels "Advertisements" or "Sponsored Links".
  assert.match(adUnit({ ...env, ADSENSE_CLIENT: 'ca-pub-1' }, '123'), /class="ad-label">Advertisements</);
  assert.equal(adUnit({ ...env, ADSENSE_CLIENT: 'ca-pub-1' }, ''), '');
});

test('every guide has a title, a description and no broken internal links', () => {
  const ids = new Set(GUIDES.map((g) => g.id));
  assert.ok(GUIDES.length >= 8);
  for (const g of GUIDES) {
    assert.ok(g.title && g.description, g.id);
    const html = g.html();
    for (const m of html.matchAll(/href="\/guides\/([a-z-]+)"/g)) assert.ok(ids.has(m[1]), `${g.id} links to a missing guide: ${m[1]}`);
    for (const m of html.matchAll(/href="(https?:[^"]+)"/g)) assert.match(m[1], /^https:\/\//, `${g.id}: non-https link`);
    assert.equal(/[—–]/.test(html), false, `${g.id}: dash`);
  }
  // Guides that rest on provider documentation say where it came from.
  for (const id of ['ai-error-codes-explained', 'outage-or-rate-limit', 'ai-api-down-developer-checklist', 'ai-tools-fail-on-work-networks', 'how-to-read-an-ai-status-page']) {
    assert.match(GUIDES.find((g) => g.id === id).html(), /<h2>Sources<\/h2>/, id);
  }
});

test('privacy policy: discloses ad-serving cookies, web beacons and Cloudflare Web Analytics', () => {
  const html = privacyPage(env);
  assert.match(html, /web beacons or IP addresses/);
  assert.match(html, /Cloudflare Web Analytics/);
  assert.match(html, /Last updated: 10 October 2026/);
  assert.equal(html.includes('—'), false);
});

test('faq page: questions, structured data and no em dashes', () => {
  const html = faqPage(env);
  assert.match(html, /<h1>Frequently asked questions<\/h1>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/aiisdown\.com\/faq">/);
  assert.equal(html.includes('—'), false);
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map((m) => JSON.parse(m[1]));
  const faq = blocks.find((b) => b['@type'] === 'FAQPage');
  assert.ok(faq.mainEntity.length >= 10);
  assert.equal(faq.mainEntity.some((q) => /<[a-z]/.test(q.acceptedAnswer.text)), false);
});

test('static pages build and use no em dashes', () => {
  for (const g of GUIDES) {
    const html = guidePage(env, g.id);
    assert.ok(html.includes('<h1>'), g.id);
    assert.equal(html.includes('—'), false, `${g.id} contains an em dash`);
  }
  assert.match(contactPage({ ...env, CONTACT_EMAIL: 'a@b.co' }), /mailto:a@b\.co/);
  assert.match(aboutPage(env), /the operator of this website/);
});

test('titles stay within about 60 characters where the content allows', () => {
  for (const p of PLATFORMS) {
    const title = platformPage(env, p, state('operational'), { incidents: [], events: [] }, now).match(/<title>(.*?)<\/title>/)[1];
    assert.ok(title.length <= 60, `${p.slug}: ${title.length} characters`);
    assert.match(title, new RegExp(`Is ${p.name.replace(/[()]/g, '\\$&')} down`));
  }
  for (const g of GUIDES) {
    const title = guidePage(env, g.id).match(/<title>(.*?)<\/title>/)[1];
    assert.ok(title.length <= 60, `${g.id}: ${title.length} characters`);
  }
  assert.match(aboutPage(env), /<title>About Is AI Down\? Who runs it/);
  assert.match(contactPage(env), /<title>Contact Is AI Down\? Report a wrong verdict/);
});

test('home and about pages say who is behind the site', () => {
  const blocks = (html) => [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map((m) => JSON.parse(m[1]));
  const home = blocks(homePage(env, {}, now));
  assert.deepEqual(home.map((b) => b['@type']), ['WebSite', 'Organization', 'FAQPage']);
  assert.deepEqual(blocks(aboutPage(env)).map((b) => b['@type']), ['AboutPage', 'Organization']);
  const org = home.find((b) => b['@type'] === 'Organization');
  assert.equal(org['@id'], 'https://aiisdown.com/#organization');
  assert.equal(home[0].publisher['@id'], org['@id']);
  assert.equal(org.logo, 'https://aiisdown.com/logo-mark-512.png');
  assert.equal(org.parentOrganization, undefined);
});
