import test from 'node:test';
import assert from 'node:assert/strict';
import { PLATFORMS, BY_SLUG } from '../src/platforms.js';
import { homePage, platformPage, apiStatus, adUnit } from '../src/render.js';
import { guidePage, GUIDES, aboutPage, contactPage } from '../src/content.js';

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
  assert.equal(adUnit({ ...env, ADSENSE_CLIENT: 'ca-pub-1' }, ''), '');
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
