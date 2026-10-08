import { PLATFORMS, pagePath } from './platforms.js';
import { esc, utcTime, utcDateTime, relTime, duration, joinNames } from './util.js';
import { slotSeries, daySeries, uptime } from './state.js';

export const STATUS = {
  operational: { label: 'Operational', icon: '✓', cls: 'ok' },
  degraded: { label: 'Having issues', icon: '!', cls: 'warn' },
  outage: { label: 'Down', icon: '✕', cls: 'bad' },
  unknown: { label: 'Checking', icon: '?', cls: 'unk' },
};
const st = (s) => STATUS[s] || STATUS.unknown;

// ---------------------------------------------------------------- layout

const jsonLd = (obj) => `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`;

export function adUnit(env, slot) {
  if (!env.ADSENSE_CLIENT || !slot) return '';
  return `<aside class="ad" aria-label="Advertisement"><span class="ad-label">Advertisement</span><ins class="adsbygoogle" style="display:block" data-ad-client="${esc(env.ADSENSE_CLIENT)}" data-ad-slot="${esc(slot)}" data-ad-format="auto" data-full-width-responsive="true"></ins><script>(adsbygoogle=window.adsbygoogle||[]).push({});</script></aside>`;
}

export function layout(env, { title, description, path, body, ld = [], noindex = false }) {
  const site = env.SITE_URL.replace(/\/$/, '');
  const url = `${site}${path}`;
  const ads = env.ADSENSE_CLIENT
    ? `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${esc(env.ADSENSE_CLIENT)}" crossorigin="anonymous"></script>`
    : '';
  return `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(url)}">
${noindex ? '<meta name="robots" content="noindex">' : '<meta name="robots" content="index, follow, max-snippet:-1">'}
<meta name="theme-color" content="#1d4ed8">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Is AI Down?">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${esc(site)}/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/style.css">
${ld.map(jsonLd).join('\n')}
${ads}
</head>
<body>
<a class="skip" href="#main">Skip to the content</a>
<header class="site-header"><div class="wrap">
<a class="brand" href="/"><img class="brand-mark" src="/logo-mark.svg" width="32" height="32" alt=""> Is AI Down?</a>
<nav aria-label="Main"><a href="/">All services</a><a href="/guides">Guides</a><a href="/about">About</a></nav>
</div></header>
<main id="main" class="wrap">
${body}
</main>
<footer class="site-footer"><div class="wrap">
<p>Is AI Down? is part of the Citeable group.<br>Citeable, The Packhouse, Broadwater Farm, Broadwater Road, West Malling, Kent, ME19 6HT<br><a href="tel:+447936855867">07936 855867</a></p>
<p>Is AI Down? is an independent service. It is not affiliated with, or endorsed by, OpenAI, Anthropic, Google, Microsoft, Perplexity, xAI, DeepSeek, Mistral, GitHub or Anysphere. Product names belong to their owners.</p>
<nav aria-label="Footer"><a href="/about">About</a><a href="/guides">Guides</a><a href="/faq">FAQ</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/contact">Contact</a><a href="/api/status.json">JSON API</a></nav>
</div></footer>
<script>
(function(){var n=Date.now();document.querySelectorAll('time[data-rel]').forEach(function(t){var s=Math.max(0,Math.round((n-Date.parse(t.getAttribute('datetime')))/1000));var m=Math.round(s/60),h=Math.round(m/60);t.textContent=s<60?'just now':m<60?m+' min ago':h<48?h+' h ago':Math.round(h/24)+' days ago';});})();
</script>
</body>
</html>`;
}

// ------------------------------------------------------------ components

const pill = (status) => {
  const s = st(status);
  return `<span class="pill ${s.cls}"><i aria-hidden="true">${s.icon}</i>${s.label}</span>`;
};

function bars24(slots, now) {
  const series = slotSeries(slots, now);
  const rects = series
    .map((v, i) => `<rect class="b${v === null ? 'n' : v}" x="${i}" y="0" width="0.78" height="10"/>`)
    .join('');
  const known = series.filter((v) => v !== null).length;
  const bad = series.filter((v) => v !== null && v > 0).length;
  const label = !known
    ? 'Last 24 hours: not enough data yet'
    : bad
      ? `Last 24 hours: problems seen in ${bad * 15} minutes`
      : 'Last 24 hours: no problems seen';
  return `<svg class="bars" viewBox="0 0 96 10" preserveAspectRatio="none" role="img" aria-label="${label}">${rects}</svg>`;
}

function bars30(days) {
  const series = daySeries(days, Date.now());
  const rects = series
    .map((d, i) => {
      let c = 'n';
      if (d.total >= 3) {
        const r = d.ok / d.total;
        c = r >= 0.99 ? '0' : r >= 0.9 ? '1' : '2';
      }
      return `<rect class="b${c}" x="${i * 2}" y="0" width="1.6" height="10"><title>${esc(d.day)}${d.total ? `: ${Math.round((d.ok / d.total) * 1000) / 10}% operational` : ': no data'}</title></rect>`;
    })
    .join('');
  return `<svg class="bars" viewBox="0 0 60 10" preserveAspectRatio="none" role="img" aria-label="Daily status for the last 30 days">${rects}</svg>`;
}

const uptimeText = (days) => {
  const u = uptime(days);
  if (u === null) return 'Building history';
  const n = Object.values(days || {}).filter(([, t]) => t > 0).length;
  return `${u}% operational, ${n < 30 ? `last ${n} days` : '30 days'}`;
};

// ------------------------------------------------------------ the words

// Components the provider reports on but we deliberately do not count.
const MAX_NAMED = 4;
const excludedText = (ex) => {
  const shown = ex.slice(0, MAX_NAMED).map((i) => `${i.name} (${i.status})`);
  const more = ex.length - shown.length;
  return ` It does report problems with ${joinNames(shown)}${more > 0 ? ` and ${more} more` : ''}, which we do not count towards this verdict.`;
};

export function signals(p, s) {
  const d = s?.data || {};
  const ex = d.feed?.ok ? d.feed.excluded || [] : [];
  const exText = ex.length ? excludedText(ex) : '';
  let feedLine;
  if (!p.feed) {
    feedLine = p.feedNote || `${p.vendor} publishes no status feed we can read.`;
  } else if (!d.feed) {
    feedLine = `We have not read ${p.vendor}'s status page yet.`;
  } else if (!d.feed.ok) {
    feedLine = `${p.vendor}'s status page could not be read just now (${d.feed.error}), so this verdict leans on our own checks.`;
  } else if (d.feed.state === 'operational') {
    feedLine = ex.length
      ? `${p.vendor}'s status page reports no problems with the parts of ${p.name} we count.${exText}`
      : `${p.vendor}'s status page reports no problems${p.feedNote ? '. ' + p.feedNote : '.'}`;
  } else if (d.feed.issues?.length) {
    feedLine = `${p.vendor}'s status page reports problems with ${joinNames(d.feed.issues.map((i) => `${i.name} (${i.status})`))}.${exText}`;
  } else {
    feedLine = `${p.vendor}'s status page reports an incident${d.feed.description ? `: ${d.feed.description}` : ''}.${exText}`;
  }

  let probeLine;
  const probes = d.probes || [];
  const core = probes.filter((x) => x.core);
  if (!p.probes.length) {
    probeLine = `We have no independent check for ${p.name}, so this page follows the official feed.`;
  } else if (!probes.length) {
    probeLine = 'Our own checks have not run yet.';
  } else {
    const failing = core.filter((x) => !x.ok);
    const ok = core.filter((x) => x.ok);
    const parts = [];
    if (ok.length) parts.push(`Our checks can reach ${joinNames(ok.map((x) => x.label))} (${Math.max(...ok.map((x) => x.ms))} ms).`);
    if (failing.length) {
      const blocked = new Set(d.blocked || []);
      for (const f of failing) {
        parts.push(
          blocked.has(f.label)
            ? `Our checker has never managed to reach ${f.label}, so we are ignoring that check.`
            : `Our check of ${f.label} is failing: ${f.note}.`,
        );
      }
    }
    const info = probes.filter((x) => !x.core);
    if (info.length) {
      parts.push(`For reference, ${joinNames(info.map((x) => `${x.label} ${x.ok ? 'answers' : 'does not answer'}`))}.`);
    }
    probeLine = parts.join(' ');
  }
  return { feedLine, probeLine };
}

export function verdictSentence(p, s) {
  if (!s) return `We are running our first checks on ${p.name}. Check back in a minute.`;
  const { feedLine, probeLine } = signals(p, s);
  switch (s.status) {
    case 'operational':
      return `${p.name} looks up. We are not seeing any problems right now.`;
    case 'degraded':
      return `${p.name} is having issues. ${s.data?.feed?.ok && s.data.feed.state !== 'operational' ? feedLine : probeLine}`;
    case 'outage':
      return `${p.name} looks down. ${s.data?.feed?.ok && s.data.feed.state === 'outage' ? feedLine : probeLine}`;
    default:
      return `We cannot tell yet whether ${p.name} is up. ${probeLine}`;
  }
}

const shortVerdict = (s) => (!s ? 'first checks running' : { operational: 'currently up', degraded: 'currently having issues', outage: 'currently down' }[s.status] || 'status unclear');

// ------------------------------------------------------------ home page

export function homePage(env, states, now) {
  const rows = PLATFORMS.map((p) => ({ p, s: states[p.slug] }));
  const known = rows.filter((r) => r.s && r.s.status !== 'unknown');
  const trouble = rows.filter((r) => r.s && (r.s.status === 'degraded' || r.s.status === 'outage'));
  const latest = rows.reduce((m, r) => Math.max(m, r.s?.checkedAt || 0), 0);

  let headline;
  let tone;
  if (!known.length) {
    headline = 'Running our first checks. Refresh in a minute.';
    tone = 'unk';
  } else if (!trouble.length) {
    headline = `All ${known.length} AI services we watch look up right now.`;
    tone = 'ok';
  } else {
    const names = trouble.map((r) => r.p.name);
    const shown = names.length > 3 ? `${names.slice(0, 3).join(', ')} and ${names.length - 3} more` : joinNames(names);
    headline = `${shown} ${names.length === 1 ? 'is' : 'are'} having problems right now.`;
    tone = trouble.some((r) => r.s.status === 'outage') ? 'bad' : 'warn';
  }

  const tiles = rows
    .map(({ p, s }) => {
      const d = s?.data || {};
      return `<a class="tile" href="${pagePath(p.slug)}">
<div class="tile-top"><span class="logo" style="--c:${p.color}" aria-hidden="true">${esc(p.initials)}</span><div><h3>${esc(p.name)}</h3><p>${esc(p.vendor)}</p></div></div>
${pill(s?.status || 'unknown')}
${bars24(d.slots, now)}
<p class="meta">${esc(uptimeText(d.days))}</p>
</a>`;
    })
    .join('\n');

  const faq = [
    ['Is AI down right now?', headline],
    [
      'How does Is AI Down? check?',
      'Every five minutes we read each provider’s own status page where it publishes one, and we send our own request to the service’s website and API to see whether it answers. We combine the two into one verdict.',
    ],
    [
      'Why does a service say it is up when I cannot get in?',
      'Our check shows whether the service is reachable and whether its provider reports a problem. It cannot see your account, your network, your region or a usage limit you may have hit. Try another device or network, then read our guide on what to do.',
    ],
    ['How often is this page updated?', 'The checks run every five minutes, so the page can be up to five minutes behind a sudden outage.'],
  ];

  const body = `
<section class="hero ${tone}" aria-live="polite">
<p class="eyebrow">Live status of the main AI services</p>
<h1>${esc(headline)}</h1>
<p class="sub">${latest ? `Last checked <time datetime="${new Date(latest).toISOString()}" data-rel>${esc(relTime(latest, now))}</time> at ${esc(utcTime(latest))}. ` : ''}We check every five minutes using each provider’s status page and our own tests.</p>
</section>
${adUnit(env, env.ADSENSE_SLOT_TOP)}
<section aria-label="AI services"><div class="grid">${tiles}</div></section>
${adUnit(env, env.ADSENSE_SLOT_INLINE)}
<section class="prose">
<h2>Is the problem the AI or you?</h2>
<p>When a chatbot stops answering it is hard to tell whether the whole service is struggling or only your connection. Each tile above combines two signals: what the provider says on its own status page, and whether our servers can reach the service right now. If both look fine, the fault is probably nearer to home. Our guide on <a href="/guides/ai-chatbot-not-working">what to do when an AI chatbot stops working</a> walks through the usual fixes, and <a href="/guides/how-we-check">how we check</a> explains exactly what our verdicts do and do not tell you.</p>
</section>
<section class="prose faq">
<h2>Questions people ask</h2>
${faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('\n')}
</section>`;

  return layout(env, {
    title: 'Is AI Down? Live ChatGPT, Claude and Gemini status',
    description: `Is ChatGPT, Claude, Gemini or another AI service down right now? ${headline} Checked every five minutes from official status pages and our own tests.`,
    path: '/',
    body,
    ld: [
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'Is AI Down?',
        url: env.SITE_URL,
        description: 'Live status of the main AI services, checked every five minutes.',
      },
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
      },
    ],
  });
}

// -------------------------------------------------------- platform page

const IMPACT = { none: 'No impact', minor: 'Minor', major: 'Major', critical: 'Critical', low: 'Low', medium: 'Medium', high: 'High' };

export function platformPage(env, p, s, extra, now) {
  const d = s?.data || {};
  const status = s?.status || 'unknown';
  const { feedLine, probeLine } = signals(p, s);
  const sentence = verdictSentence(p, s);
  const others = PLATFORMS.filter((x) => x.slug !== p.slug);

  const issueList = d.feed?.ok && d.feed.issues?.length
    ? `<ul class="plain">${d.feed.issues.map((i) => `<li>${esc(i.name)}: ${esc(i.status)}</li>`).join('')}</ul>`
    : '';

  const incidents = (extra.incidents || [])
    .map((i) => {
      const open = !i.resolved_at;
      const when = open
        ? `Started ${esc(utcDateTime(i.started_at))}, updated <time datetime="${new Date(i.updated_at).toISOString()}" data-rel>${esc(relTime(i.updated_at, now))}</time>`
        : `${esc(utcDateTime(i.started_at))}, resolved after ${esc(duration(i.resolved_at - i.started_at))}`;
      return `<li><span class="tag ${open ? 'warn' : 'ok'}">${open ? 'Open' : 'Resolved'}</span> <strong>${esc(i.title)}</strong><br><span class="muted">${when}${i.impact ? ` · ${esc(IMPACT[i.impact] || i.impact)} impact` : ''}</span></li>`;
    })
    .join('');

  const events = (extra.events || [])
    .map(
      (e) =>
        `<li><strong>${esc(utcDateTime(e.at))}</strong>: ${esc(st(e.from_status).label)} to ${esc(st(e.to_status).label)}<br><span class="muted">${esc(e.summary || '')}</span></li>`,
    )
    .join('');

  const faq = [
    [`Is ${p.name} down right now?`, sentence],
    [
      `How can I tell if ${p.name} is down for everyone or only for me?`,
      `Compare what you see with the two signals above. If ${p.vendor}'s status page and our checks both look healthy, the problem is likely your account, network, browser or a usage limit. Try another device or connection, sign out and back in, and turn off any VPN or browser extensions.`,
    ],
    [`Where is the official ${p.name} status page?`, `${p.vendor} publishes status information at ${p.statusPage}.`],
    ['How often is this page updated?', 'Our checks run every five minutes, so this page can lag a sudden outage by up to five minutes.'],
  ];

  const body = `
<nav class="crumbs" aria-label="Breadcrumb"><a href="/">All AI services</a> / ${esc(p.name)}</nav>
<section class="hero ${st(status).cls}" aria-live="polite">
<p class="eyebrow">${esc(p.vendor)} · ${esc(p.blurb)}</p>
<h1>Is ${esc(p.name)} down right now?</h1>
<p class="answer">${pill(status)} <span>${esc(sentence)}</span></p>
${s ? `<p class="sub">Last checked <time datetime="${new Date(s.checkedAt).toISOString()}" data-rel>${esc(relTime(s.checkedAt, now))}</time> at ${esc(utcTime(s.checkedAt))}. ${status !== 'unknown' && s.checkedAt - s.since >= 600000 ? `Same verdict since ${esc(utcDateTime(s.since))}.` : ''}</p>` : ''}
</section>
${adUnit(env, env.ADSENSE_SLOT_TOP)}
<section class="cards" aria-label="The two signals">
<div class="card"><h2>${esc(p.vendor)}’s status page</h2><p>${esc(feedLine)}</p>${issueList}<p class="muted"><a href="${esc(p.statusPage)}" rel="noopener">Open the official status page</a></p></div>
<div class="card"><h2>Our own check</h2><p>${esc(probeLine)}</p><p class="muted">We send an unauthenticated request to the service every five minutes. A sign-in or bot-protection reply still proves it is answering.</p></div>
</section>
<section class="history" aria-label="History">
<h2>Last 24 hours</h2>
${bars24(d.slots, now)}
<div class="axis"><span>24 h ago</span><span>now</span></div>
<h2>Last 30 days</h2>
${bars30(d.days)}
<div class="axis"><span>30 days ago</span><span>today</span></div>
<p class="muted">${esc(uptimeText(d.days))}. Green is fully operational, amber is having issues, red is down, grey is no data.</p>
</section>
${adUnit(env, env.ADSENSE_SLOT_INLINE)}
<section class="prose">
<h2>Recent incidents</h2>
${
  incidents
    ? `${p.feed?.incidents === 'info' ? `<p class="muted">${esc(p.vendor)}’s status page covers more than ${esc(p.name)}, so some of these may not affect it.</p>` : ''}<ul class="timeline">${incidents}</ul>`
    : `<p>No incidents have been reported on ${esc(p.vendor)}’s status page since we started watching.</p>`
}
<h2>Changes we have observed</h2>
${events ? `<ul class="timeline">${events}</ul>` : `<p>We have not seen ${esc(p.name)} change status since we started watching.</p>`}
</section>
<section class="prose">
<h2>If ${esc(p.name)} is not working for you</h2>
<p>Check the two signals above first. When both look healthy, try a different device or network, sign out and back in, and switch off any VPN or browser extensions. Hitting a usage limit can look like an outage, so check for a message about limits. Our guide has the <a href="/guides/ai-chatbot-not-working">full checklist</a>, and another explains <a href="/guides/status-page-says-up-but-broken">why a service can be up but broken for you</a>.</p>
</section>
<section class="prose faq">
<h2>Questions about ${esc(p.name)} status</h2>
${faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('\n')}
</section>
<section class="prose">
<h2>Other AI services</h2>
<p class="chips">${others.map((o) => `<a href="${pagePath(o.slug)}">${esc(o.name)}</a>`).join('')}</p>
</section>`;

  return layout(env, {
    title: `Is ${p.name} down right now? Live ${p.name} status`,
    description: `Is ${p.name} down? Right now it is ${shortVerdict(s)}. Live status from ${p.vendor}'s status page plus our own checks, updated every five minutes.`,
    path: pagePath(p.slug),
    body,
    ld: [
      {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: `Is ${p.name} down right now?`,
        url: `${env.SITE_URL}${pagePath(p.slug)}`,
        ...(s ? { dateModified: new Date(s.checkedAt).toISOString() } : {}),
        isPartOf: { '@type': 'WebSite', name: 'Is AI Down?', url: env.SITE_URL },
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'All AI services', item: `${env.SITE_URL}/` },
          { '@type': 'ListItem', position: 2, name: p.name, item: `${env.SITE_URL}${pagePath(p.slug)}` },
        ],
      },
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
      },
    ],
  });
}

// ------------------------------------------------------------- JSON API

export function apiStatus(env, states, now) {
  return {
    generated_at: new Date(now).toISOString(),
    site: env.SITE_URL,
    note: 'Statuses: operational, degraded, outage, unknown. Checked every five minutes.',
    services: PLATFORMS.map((p) => apiService(env, p, states[p.slug])),
  };
}

export function apiService(env, p, s) {
  return {
    slug: p.slug,
    name: p.name,
    vendor: p.vendor,
    status: s?.status || 'unknown',
    since: s ? new Date(s.since).toISOString() : null,
    checked_at: s ? new Date(s.checkedAt).toISOString() : null,
    uptime_30d_percent: s ? uptime(s.data?.days) : null,
    summary: verdictSentence(p, s),
    page: `${env.SITE_URL}${pagePath(p.slug)}`,
    official_status_page: p.statusPage,
  };
}
