import { layout } from './render.js';
import { esc } from './util.js';
import { PLATFORMS, pagePath } from './platforms.js';

const page = (env, path, title, description, html, extra = {}) =>
  layout(env, {
    title,
    description,
    path,
    body: `<article class="prose article">${html}</article>`,
    ...extra,
  });

const operator = (env) => (env.OPERATOR_NAME ? esc(env.OPERATOR_NAME) : 'the operator of this website');

export const GUIDES = [
  {
    id: 'how-we-check',
    title: 'How we check whether AI services are down',
    description:
      'Exactly what Is AI Down? measures, how often, what a verdict means and what our checks cannot see.',
    html: () => `
<h1>How we check whether AI services are down</h1>
<p class="lede">A status checker is only worth using if you know what it can and cannot tell you. This is the whole method.</p>
<h2>Two signals, one verdict</h2>
<p>Every five minutes a scheduled job on Cloudflare’s network gathers two kinds of evidence for each service. The first is the provider’s own status page, read by machine where the provider publishes a feed we can use. The second is our own test: we send a plain request to the service’s website and, where it has one, its API, and see whether anything answers.</p>
<p>The two are combined into one of three verdicts. <strong>Operational</strong> means nothing is reported and our checks get through. <strong>Having issues</strong> means the provider reports a problem with part of the service, or our checks have failed more than once in a row. <strong>Down</strong> means the provider reports a major outage of its core service, or, for services with no readable status feed, our checks have failed for about fifteen minutes in a row.</p>
<h2>What counts as reachable</h2>
<p>Many AI sites refuse automated requests. A reply that says “sign in” or “you look like a robot” still proves the service is answering, so we count it as reachable. Only a server error, a timeout or a failed connection counts as a failure. We also ignore a check that has never once succeeded from our side, because that points to us being blocked rather than the service being broken.</p>
<h2>Why we are careful about calling something down</h2>
<p>Our own check on its own can never overrule a provider’s status page that says everything is fine. It can move a service to “having issues”, never to “down”. The most common mistake in a status checker is reporting a healthy site as dead because it dislikes scripts, and this rule is there to stop it.</p>
<h2>The uptime figure</h2>
<p>The 30-day figure is the share of our five-minute checks in which the service was fully operational. A partial problem counts against it. It is not the same as the provider’s own uptime promise and should not be read as one. It stays hidden until we have at least an hour of data.</p>
<h2>What we cannot see</h2>
<p>We cannot see your account, your network, your region, or whether you have reached a usage limit. We cannot tell whether answers are slow or poor, only whether the service responds. For Gemini, Microsoft Copilot, Grok and DeepSeek the providers publish no feed we can read, so those verdicts lean more heavily on our own checks and say so on the page.</p>
<h2>Data for developers</h2>
<p>The same data is available as JSON at <a href="/api/status.json">/api/status.json</a>, with one service per file at <code>/api/chatgpt.json</code> and so on. It is free for reasonable use and may be rate limited if it is abused.</p>`,
  },
  {
    id: 'ai-chatbot-not-working',
    title: 'What to do when an AI chatbot stops working',
    description:
      'A practical checklist for when ChatGPT, Claude, Gemini or another AI assistant will not load, answer or sign you in.',
    html: () => `
<h1>What to do when an AI chatbot stops working</h1>
<p class="lede">Most “outages” turn out to be one of a handful of ordinary problems. Work down this list before you give up on the afternoon.</p>
<h2>1. Find out if it is everyone or just you</h2>
<p>Check the service on <a href="/">our status page</a> and on the provider’s own status page. If either reports a problem, you can stop troubleshooting and wait. Providers usually post the cause within the first half hour and update as they fix it.</p>
<h2>2. Try a different route in</h2>
<p>If the website is failing, try the mobile app, or the other way round. Try another browser, a private window, or a different network such as mobile data in place of Wi-Fi. A fault that disappears on another route tells you where the problem sits.</p>
<h2>3. Remove the usual suspects</h2>
<p>Switch off any VPN, ad blocker or browser extension and reload. Corporate networks and some VPNs trigger bot-protection loops that look like an outage. Sign out and back in, and clear the site’s cookies if the page keeps looping.</p>
<h2>4. Check you have not hit a limit</h2>
<p>Usage caps, message limits and slow-down modes are easy to mistake for a fault. Look for a banner or message about limits, a paused feature or a model that has become unavailable on your plan.</p>
<h2>5. Do not hammer it</h2>
<p>Repeatedly resubmitting a long request during an outage can leave you with duplicates and, on some plans, use up your allowance. Copy your prompt somewhere safe, wait a few minutes, then retry once.</p>
<h2>6. Keep a fallback</h2>
<p>If you depend on one assistant for work, keep a second one signed in. Most of the major services failed on different days, so a spare is a cheap piece of insurance. For anything urgent, have a plan that does not need an AI at all.</p>
<p>If you have been through all of this and the provider reports nothing, read <a href="/guides/status-page-says-up-but-broken">why a service can be up but broken for you</a>.</p>`,
  },
  {
    id: 'status-page-says-up-but-broken',
    title: 'Why an AI service can be “up” but broken for you',
    description:
      'Why a status page can say everything is fine while your AI assistant fails, and how to work out which it is.',
    html: () => `
<h1>Why an AI service can be “up” but broken for you</h1>
<p class="lede">“All systems operational” is a statement about the provider’s platform, not about your session. There are several ways to be left out of a working service.</p>
<h2>The status page is slower than the problem</h2>
<p>Providers often confirm an incident only after their own engineers have investigated. In the first minutes of a real outage, a status page can still show green. A status checker like ours narrows that gap a little, because our own request does not wait for a human to update a page, but it cannot close it entirely.</p>
<h2>Only part of the service is affected</h2>
<p>A provider can report a problem with voice mode, file uploads or one model while the main chat works. Whether that matters depends on what you were trying to do. On each service page we list the components the provider says are affected, not only the headline.</p>
<h2>It is specific to your account or plan</h2>
<p>Usage limits, a lapsed payment, a flagged account or a feature that has not reached your plan can all produce errors that nobody else sees. These never appear on a status page.</p>
<h2>It is specific to your region or network</h2>
<p>Traffic is routed through different data centres in different places. A fault in one region, or a block applied by your employer, school or internet provider, can leave you cut off while the rest of the world carries on.</p>
<h2>Your browser is in the way</h2>
<p>Extensions, stale cookies, a VPN, or a bot-protection check that keeps failing can make a working site look dead. A private window on a different network settles it quickly.</p>
<h2>Demand is the problem</h2>
<p>At busy times a service can be technically up but so loaded that requests time out or queue. Providers do not always class that as an outage, although it feels like one.</p>
<p>To test which case you are in, follow the steps in <a href="/guides/ai-chatbot-not-working">what to do when an AI chatbot stops working</a>.</p>`,
  },
];

export function guidesIndex(env) {
  return page(
    env,
    '/guides',
    'AI status guides: what to do when AI is down',
    'Plain-English guides on checking whether an AI service is down and what to do when ChatGPT, Claude, Gemini or another assistant stops working.',
    `<h1>Guides</h1>
<ul class="timeline">${GUIDES.map((g) => `<li><a href="/guides/${g.id}"><strong>${esc(g.title)}</strong></a><br><span class="muted">${esc(g.description)}</span></li>`).join('')}</ul>`,
  );
}

export function guidePage(env, id) {
  const g = GUIDES.find((x) => x.id === id);
  if (!g) return null;
  return page(env, `/guides/${g.id}`, `${g.title} | Is AI Down?`, g.description, g.html(), {
    ld: [
      {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: g.title,
        description: g.description,
        inLanguage: 'en-GB',
        mainEntityOfPage: `${env.SITE_URL}/guides/${g.id}`,
      },
    ],
  });
}

export function aboutPage(env) {
  return page(
    env,
    '/about',
    'About Is AI Down?',
    'What Is AI Down? is, how it works, and how to contact us.',
    `<h1>About Is AI Down?</h1>
<p>Is AI Down? is a small, independent website that tells you whether the main AI services are working. It currently covers ${PLATFORMS.map((p) => esc(p.name)).join(', ')}.</p>
<p>Every five minutes we read each provider’s own status page, where one is available, and test whether the service answers. The page for each service shows both signals side by side, so you can see why we are saying what we say. The full method is in <a href="/guides/how-we-check">how we check</a>.</p>
<p>The site is run by ${operator(env)}. It is funded by advertising, which never changes a verdict. We are not affiliated with any of the companies we cover.</p>
<p>Spotted a wrong verdict, or want another service added? Tell us through the <a href="/contact">contact page</a>.</p>`,
  );
}

export function privacyPage(env) {
  return page(
    env,
    '/privacy',
    'Privacy policy | Is AI Down?',
    'What data Is AI Down? collects, who processes it and your rights.',
    `<h1>Privacy policy</h1>
<p>This policy explains what happens to your data when you use this website. It is run by ${operator(env)} (“we”).</p>
<h2>What we collect</h2>
<p>We do not ask you to create an account or give us any personal details, and we do not set our own cookies. Like any website, our hosting provider, Cloudflare, processes technical information about each request, such as your IP address, browser type and the page requested, in order to deliver the site, keep it secure and measure load. We do not use this to identify you.</p>
<h2>Advertising</h2>
<p>This site is funded by advertising supplied by Google AdSense. Google and its partners may use cookies and similar technologies to show and measure ads and, where you consent, to personalise them. In the UK and European Economic Area you will be asked for your consent before personalised advertising is used. You can learn how Google uses data from sites that use its services at <a href="https://policies.google.com/technologies/partner-sites" rel="noopener">policies.google.com/technologies/partner-sites</a> and manage ad personalisation at <a href="https://adssettings.google.com" rel="noopener">adssettings.google.com</a>.</p>
<h2>Your rights</h2>
<p>Under UK data protection law you have rights over personal data held about you, including access, correction and erasure, and you may complain to the Information Commissioner’s Office at <a href="https://ico.org.uk" rel="noopener">ico.org.uk</a>. Because we hold no account data, most requests will concern the technical logs processed by our hosting and advertising providers, and you may need to contact them directly. For anything else, use the <a href="/contact">contact page</a>.</p>
<h2>Changes</h2>
<p>We may update this policy and will change the page when we do.</p>`,
  );
}

export function termsPage(env) {
  return page(
    env,
    '/terms',
    'Terms of use | Is AI Down?',
    'The terms for using Is AI Down? and its JSON data.',
    `<h1>Terms of use</h1>
<p>By using this website you agree to these terms. It is run by ${operator(env)}.</p>
<h2>Information only</h2>
<p>The statuses shown here are produced automatically from providers’ public status information and our own tests. They can be wrong, late or incomplete, and they are provided as is, without any promise of accuracy or availability. Do not rely on them for decisions where an error could cause harm or loss. Always check the provider’s own status page for anything important.</p>
<h2>No affiliation</h2>
<p>We are not connected with the companies whose services we describe. Their names and marks belong to them and are used only to say which service we mean.</p>
<h2>The JSON data</h2>
<p>You may use our JSON endpoints for reasonable, non-abusive purposes, and we may rate limit or block heavy use. If you republish the data, please link back to this site.</p>
<h2>Liability</h2>
<p>To the fullest extent the law allows, we are not liable for loss arising from your use of, or inability to use, this website. Nothing in these terms limits liability that cannot lawfully be limited.</p>
<h2>Changes</h2>
<p>We may change these terms and will update this page when we do. These terms are governed by the law of England and Wales.</p>`,
  );
}

export function contactPage(env) {
  const mail = env.CONTACT_EMAIL
    ? `<p>Email: <a href="mailto:${esc(env.CONTACT_EMAIL)}">${esc(env.CONTACT_EMAIL)}</a></p>`
    : '<p>Contact details are being set up and will appear here shortly.</p>';
  return page(
    env,
    '/contact',
    'Contact | Is AI Down?',
    'How to contact Is AI Down? about a wrong verdict, a missing service or anything else.',
    `<h1>Contact</h1>
<p>Found a verdict that looks wrong, or want a service added? We would like to hear about it. Please include the service name and roughly when you saw the problem.</p>
${mail}`,
  );
}

export function notFoundPage(env) {
  return layout(env, {
    title: 'Page not found | Is AI Down?',
    description: 'That page does not exist.',
    path: '/404',
    noindex: true,
    body: `<article class="prose article"><h1>Page not found</h1><p>That page does not exist. Try the <a href="/">live status of all services</a>:</p><p class="chips">${PLATFORMS.map((p) => `<a href="${pagePath(p.slug)}">${esc(p.name)}</a>`).join('')}</p></article>`,
  });
}
