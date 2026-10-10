import { layout, orgLd, orgId } from './render.js';
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
const address = (env) => (env.OPERATOR_ADDRESS ? esc(env.OPERATOR_ADDRESS) : '');

// A "Sources" block for guides that rest on provider documentation.
const sourcesBlock = (list) =>
  `<h2>Sources</h2>
<p class="muted">Read on 8 October 2026. Providers change their documentation, so check it for anything important.</p>
<ul>${list.map(([label, url]) => `<li><a href="${url}" rel="noopener">${label}</a></li>`).join('')}</ul>`;

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
<p>The 30-day figure is the share of our five-minute checks in which the service was fully operational. A partial problem counts against it. It is not the same as the provider’s own uptime promise and should not be read as one. It stays hidden until we have at least three days of data, and until then the page says it is still building history.</p>
<h2>What we cannot see</h2>
<p>We cannot see your account, your network, your region, or whether you have reached a usage limit. We cannot tell whether answers are slow or poor, only whether the service responds. Microsoft Copilot, Grok and DeepSeek publish no status feed we can read, so those verdicts rely on our own checks and say so on the page. Google publishes no feed for the Gemini app itself, so for Gemini we read Google Cloud’s incident list for Gemini and Vertex AI and combine it with our own checks.</p>
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
<p>Check the service on <a href="/">our status page</a> and on the provider’s own status page. If either reports a problem, you can stop troubleshooting and wait. Providers normally update their status page as they investigate and fix it.</p>
<h2>2. Try a different route in</h2>
<p>If the website is failing, try the mobile app, or the other way round. Try another browser, a private window, or a different network such as mobile data in place of Wi-Fi. A fault that disappears on another route tells you where the problem sits.</p>
<h2>3. Remove the usual suspects</h2>
<p>Switch off any VPN, ad blocker or browser extension and reload. Corporate networks and some VPNs trigger bot-protection loops that look like an outage. Sign out and back in, and clear the site’s cookies if the page keeps looping.</p>
<h2>4. Check you have not hit a limit</h2>
<p>Usage caps, message limits and slow-down modes are easy to mistake for a fault. Look for a banner or message about limits, a paused feature or a model that has become unavailable on your plan.</p>
<h2>5. Do not hammer it</h2>
<p>Repeatedly resubmitting a long request during an outage can leave you with duplicates and, on some plans, use up your allowance. Copy your prompt somewhere safe, wait a few minutes, then retry once.</p>
<h2>6. Keep a fallback</h2>
<p>If you depend on one assistant for work, keep a second one signed in. Services tend to fail at different times, so a spare is a cheap piece of insurance. For anything urgent, have a plan that does not need an AI at all.</p>
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
<p>Traffic is routed through different data centres in different places. A fault in one region, or a block applied by your employer, school or internet provider, can leave you cut off while the rest of the world carries on. Our guide to <a href="/guides/ai-service-blocked-region-or-network">regional and network blocks</a> shows how to tell which it is.</p>
<h2>Your browser is in the way</h2>
<p>Extensions, stale cookies, a VPN, or a bot-protection check that keeps failing can make a working site look dead. A private window on a different network settles it quickly.</p>
<h2>Demand is the problem</h2>
<p>At busy times a service can be technically up but so loaded that requests time out or queue. Providers do not always class that as an outage, although it feels like one.</p>
<p>To test which case you are in, follow the steps in <a href="/guides/ai-chatbot-not-working">what to do when an AI chatbot stops working</a>.</p>`,
  },
  {
    id: 'how-to-read-an-ai-status-page',
    title: 'How to read an AI status page',
    description:
      'What the labels on an AI provider’s status page mean, why one part can be down while the rest works, and what a status page cannot tell you.',
    html: () => `
<h1>How to read an AI status page</h1>
<p class="lede">Almost every AI provider has an official status page. The labels on it are precise, and the difference between them is easy to miss when something is not working.</p>
<h2>It is a list of parts, not one light</h2>
<p>A status page does not show a single “up” or “down”. It lists components, and each has its own state. A provider’s page might list its chat website, its developer API, a coding tool and a developer console as separate lines. One can be struggling while the others work normally, so the first thing to read is which component is affected. Our <a href="/is-chatgpt-down">ChatGPT</a> and <a href="/is-claude-down">Claude</a> pages show how the same idea applies to two real services.</p>
<h2>What the component labels mean</h2>
<p>Many providers use the same status-page software, which uses a small set of labels for each component:</p>
<ul>
<li><strong>Operational.</strong> Nothing is reported.</li>
<li><strong>Degraded performance.</strong> It works but is slower or less reliable than usual.</li>
<li><strong>Partial outage.</strong> Some users, regions or features are affected.</li>
<li><strong>Major outage.</strong> The component is largely unavailable.</li>
<li><strong>Under maintenance.</strong> The provider has planned the downtime.</li>
</ul>
<h2>How an incident moves along</h2>
<p>Providers commonly describe an incident in stages, such as investigating, identified, monitoring and resolved. “Identified” means the cause is known and a fix is under way. “Monitoring” means a fix has gone in and the provider is watching to see whether it holds, so errors can briefly come back. Read the latest update text, not just the headline. It often says what is and is not affected, for example that a developer console is slow while the chat product is unaffected.</p>
<h2>What a status page cannot tell you</h2>
<ul>
<li><strong>It can lag.</strong> A page is updated by people, so the first minutes of a real fault may show green.</li>
<li><strong>It describes the provider, not you.</strong> It cannot see your account, your plan, your usage limits, your region or your network.</li>
<li><strong>It rarely measures slowness.</strong> A service can be technically up and still painfully slow.</li>
<li><strong>Some providers publish nothing readable.</strong> For those, an independent check is the only signal available.</li>
</ul>
<h2>How we use them</h2>
<p>We read each provider’s own page where a script can, and combine it with a test of our own. Our <a href="/guides/how-we-check">method guide</a> explains which components decide “down” for each service, and each service page names any component we deliberately do not count.</p>
<p>If the page says everything is fine and you still cannot get in, read <a href="/guides/status-page-says-up-but-broken">why a service can be up but broken for you</a>.</p>
${sourcesBlock([
  ['Anthropic status page', 'https://status.claude.com'],
  ['OpenAI status page', 'https://status.openai.com'],
])}`,
  },
  {
    id: 'ai-error-codes-explained',
    title: 'AI error codes explained: 401, 403, 429, 500, 503 and 529',
    description:
      'What the common AI API error codes mean according to OpenAI, Anthropic, Google, DeepSeek, Mistral and others, and which ones point to an outage.',
    html: () => `
<h1>AI error codes explained: 401, 403, 429, 500, 503 and 529</h1>
<p class="lede">An error number on its own does not tell you whether the provider is down. Some mean something is wrong with your request or account. Others point at the service. This guide uses what the providers themselves document.</p>
<h2>The rule of thumb</h2>
<p>In general, codes in the 400s mean the request was refused because of something on your side, such as a bad key, no credit or too many requests. Codes in the 500s mean a problem on the provider’s side. The providers’ own advice follows that split: do not retry most 400s, because the same request will fail again, and retry 500s after a wait.</p>
<h2>The codes that are about you</h2>
<ul>
<li><strong>401.</strong> Authentication failed. OpenAI lists a wrong or outdated key, not belonging to an organisation, and a request from an address that is not on your allowlist. Anthropic describes a malformed, revoked or expired key. xAI and DeepSeek describe a missing or wrong key.</li>
<li><strong>402.</strong> A billing problem. Anthropic documents a payment problem. DeepSeek documents it as insufficient balance, meaning your account has run out of funds.</li>
<li><strong>403.</strong> Permission refused. OpenAI uses it when a country, region or territory is not supported. Anthropic and xAI use it when a key lacks permission for the resource.</li>
<li><strong>400 and 422.</strong> The request itself is wrong or failed validation. Fix the request, then try again.</li>
</ul>
<h2>429 is not one thing</h2>
<p>A 429 means “too many”, but the reason varies. OpenAI documents several different 429 errors: a rate limit reached, credit used up, an organisation or project spend limit reached, a usage quota, and a separate “slow down” signal after traffic grew too fast. Anthropic documents a rate limit or a monthly spend cap, and says a spend-cap 429 carries no retry delay and keeps failing until access resumes. Google calls its version RESOURCE_EXHAUSTED and links it to rate limits or quotas. In every case the documented causes are limits on your account or traffic, not a fault with the service.</p>
<h2>The codes that point at the service</h2>
<ul>
<li><strong>500.</strong> An unexpected problem on the provider’s side. OpenAI and Anthropic both suggest retrying after a wait. OpenAI adds that you should check its status page if the error persists.</li>
<li><strong>502, 503 and 504.</strong> Mistral lists these as a bad response upstream, a service that is down or overloaded, and a timeout. All are worth retrying with a delay.</li>
<li><strong>503 on its own.</strong> OpenAI describes the model as temporarily overloaded. DeepSeek describes the server as overloaded by demand. Google describes the service as temporarily unreachable or overloaded.</li>
<li><strong>529.</strong> Anthropic’s code for an overloaded API. Anthropic says it can happen when traffic is high across all users.</li>
<li><strong>504 and 408.</strong> A timeout. Anthropic suggests streaming responses for long requests.</li>
</ul>
<h2>What to do with this</h2>
<p>If you see 401, 402, 403, 400 or 422, check your key, billing and request first. If you see a 429, look at your limits and slow down. If you see 500, 503, 504 or 529, check the provider’s status page and ours, and retry after a pause. The next guide, <a href="/guides/outage-or-rate-limit">outage or rate limit?</a>, takes you through telling the difference.</p>
${sourcesBlock([
  ['OpenAI API error codes', 'https://developers.openai.com/api/docs/guides/error-codes'],
  ['Claude API errors', 'https://platform.claude.com/docs/en/api/errors'],
  ['Gemini API troubleshooting guide', 'https://ai.google.dev/gemini-api/docs/troubleshooting'],
  ['DeepSeek API error codes', 'https://api-docs.deepseek.com/quick_start/error_codes/'],
  ['Mistral error glossary', 'https://docs.mistral.ai/resources/error-glossary'],
  ['xAI API debugging guide', 'https://docs.x.ai/docs/key-information/debugging'],
])}`,
  },
  {
    id: 'outage-or-rate-limit',
    title: 'Outage or rate limit? How to tell the difference',
    description:
      'A short way to work out whether an AI service is down for everyone or you have hit a limit, using the error you see and the provider’s status page.',
    html: () => `
<h1>Outage or rate limit? How to tell the difference</h1>
<p class="lede">They look alike from the outside: the answer does not arrive. But one is a problem on the provider’s side and the other is a limit on your account. The fix is different.</p>
<h2>Start with the message</h2>
<ul>
<li><strong>A message about limits, usage, credit or billing</strong> points to your account. Providers document limits as rate limits, spend caps and used-up credit. Nothing is broken.</li>
<li><strong>A message about being overloaded, unavailable or timed out</strong> points to the service. Providers describe these as temporary and suggest retrying after a wait.</li>
<li><strong>A bare error number.</strong> Use <a href="/guides/ai-error-codes-explained">the guide to error codes</a> to see which side it belongs to. As a rule, 429 is about limits and 500, 503 and 529 are about the service.</li>
</ul>
<h2>Then check whether it is everyone</h2>
<ol>
<li>Open the provider’s status page and ours. If either reports a problem with the part you are using, you can stop and wait.</li>
<li>If both look healthy, try another route in: the other app or the website, a different browser, a different network.</li>
<li>If you use an API, try a different key, project or model if you have one. A fault that follows your account is probably a limit. A fault that follows the model is probably the service.</li>
</ol>
<h2>Why this is not always clear-cut</h2>
<p>Some limits are sensitive to how fast you ramp up. Anthropic notes that a sharp rise in an organisation’s usage can bring 429 errors because of what it calls acceleration limits, and advises increasing traffic gradually. OpenAI documents a “slow down” response for the same reason. So a 429 can follow a sudden jump in your own traffic, and a mix of 429s and 5xx errors does not by itself prove which problem you are seeing.</p>
<h2>What not to do</h2>
<ul>
<li><strong>Do not hammer it.</strong> Perplexity’s documentation warns that aggressive retry loops without delays make throttling worse. Waiting longer between tries is the standard advice.</li>
<li><strong>Do not keep retrying errors about your request or your account.</strong> A wrong key or an empty balance will fail every time.</li>
</ul>
<h2>When it really is the provider</h2>
<p>If the provider reports the problem, there is little to do but wait and have a fallback. Our <a href="/guides/ai-api-down-developer-checklist">checklist for developers</a> covers how to build that in. For everyday users, <a href="/guides/ai-chatbot-not-working">what to do when an AI chatbot stops working</a> has the practical steps.</p>
${sourcesBlock([
  ['OpenAI API error codes', 'https://developers.openai.com/api/docs/guides/error-codes'],
  ['Claude API errors', 'https://platform.claude.com/docs/en/api/errors'],
  ['Perplexity SDK error handling', 'https://docs.perplexity.ai/guides/perplexity-sdk-error-handling'],
])}`,
  },
  {
    id: 'ai-api-down-developer-checklist',
    title: 'When an AI API you depend on goes down: a checklist for developers',
    seoTitle: 'AI API outage checklist for developers',
    description:
      'Practical steps for apps that call AI APIs: which errors to retry, how to back off, how to handle long requests, and why to keep a fallback.',
    html: () => `
<h1>When an AI API you depend on goes down: a checklist for developers</h1>
<p class="lede">If your product calls an AI API, that API will have bad days. These steps come from what the providers themselves recommend.</p>
<h2>1. Only retry what can succeed</h2>
<p>Google’s troubleshooting guide separates errors worth retrying (429, 408 and the 5xx errors) from errors about the request (400, 402 and 403), which will fail again. Perplexity says the same: do not retry 4xx errors, and retry 5xx errors with backoff. Retrying a bad key or an empty balance only adds noise.</p>
<h2>2. Back off, and add jitter</h2>
<p>Wait longer after each failure, and add a random element so many clients do not retry in step. Google and Perplexity both recommend exponential backoff with jitter. Anthropic’s SDK retries transient failures twice by default, with exponential backoff, and respects a retry-after header when there is one. OpenAI tells you to follow its retry headers.</p>
<h2>3. Know which 429 you have</h2>
<p>A rate limit will clear if you slow down. A spend cap or used-up credit will not clear until you change your account. Anthropic notes that a spend-cap 429 has no retry delay and keeps failing until access resumes, so a retry loop on it is wasted effort. See <a href="/guides/ai-error-codes-explained">the error-codes guide</a>.</p>
<h2>4. Handle long requests properly</h2>
<p>Anthropic advises streaming, or its batch interface, for long requests, because some networks drop idle connections and a long wait without a response can fail without any answer coming back. It also suggests keeping a TCP keep-alive on direct integrations.</p>
<h2>5. Log the request ID</h2>
<p>Anthropic returns a request ID on every response and asks you to include it when contacting support. Keeping the IDs of failed calls saves time later. Other providers have equivalents, so check their documentation.</p>
<h2>6. Keep a fallback</h2>
<p>Perplexity’s documentation recommends graceful degradation with fallbacks. DeepSeek’s error page suggests, for the rate-limit error, temporarily using another provider’s API. At minimum, decide in advance what your product shows when the AI is unavailable, such as a clear message instead of a spinner that never ends.</p>
<h2>7. Check before you debug</h2>
<p>Before spending an hour on your own code, look at the provider’s status page and ours. If the provider reports a problem with the API, you can stop. Our <a href="/api/status.json">JSON feed</a> gives the current verdict for each service, free for reasonable use. Remember that our verdict follows the consumer products for some services, and the API can fail separately.</p>
${sourcesBlock([
  ['Gemini API troubleshooting guide', 'https://ai.google.dev/gemini-api/docs/troubleshooting'],
  ['Perplexity SDK error handling', 'https://docs.perplexity.ai/guides/perplexity-sdk-error-handling'],
  ['Claude API errors', 'https://platform.claude.com/docs/en/api/errors'],
  ['OpenAI API error codes', 'https://developers.openai.com/api/docs/guides/error-codes'],
  ['DeepSeek API error codes', 'https://api-docs.deepseek.com/quick_start/error_codes/'],
])}`,
  },
  {
    id: 'ai-tools-fail-on-work-networks',
    title: 'Why AI tools fail on work networks',
    description:
      'Why Cursor, GitHub Copilot and Microsoft Copilot can break on a company network while working at home, and what your IT team can check.',
    html: () => `
<h1>Why AI tools fail on work networks</h1>
<p class="lede">If an AI tool works at home but fails at the office, the provider is probably fine. Company networks add proxies, firewalls and certificate checks, and these can interfere with tools that stream responses.</p>
<h2>Proxies and HTTP/2</h2>
<p>Cursor streams responses over HTTP/2, and its documentation says some corporate proxies, such as Zscaler, block it. The suggested fix is to switch Cursor’s HTTP compatibility mode to HTTP/1.1 in its network settings and restart. Cursor also has built-in network diagnostics in its settings that check its connection to its servers.</p>
<h2>Proxy settings and certificates</h2>
<p>GitHub’s documentation on Copilot network errors describes timeouts and connection resets that come from a proxy blocking the connection, and certificate errors such as “unable to verify the first certificate”. These appear when a proxy inspects encrypted traffic with a certificate your machine does not recognise. GitHub says Copilot does not support proxy addresses that begin with https://, and needs basic or Kerberos authentication where one is required. It suggests testing your connection with curl and asking your IT team to configure the proxy or install the certificate properly.</p>
<h2>Firewalls and allowlists</h2>
<p>Where a firewall blocks outbound traffic, the tool’s domains need to be allowed. Cursor lists cursor.sh, cursor-cdn.com, cursorapi.com and cursorvm.com, including subdomains. GitHub’s documentation has a separate page on firewall settings for Copilot.</p>
<h2>VPNs</h2>
<ul>
<li>Cursor says a VPN can trigger a “suspicious activity” block. Turning the VPN off, starting a fresh chat or signing in another way can help.</li>
<li>After you disconnect from a VPN, Cursor suggests fully restarting it, not just reloading the window, so old DNS settings are cleared.</li>
<li>GitHub lists VPNs and firewalls among the things that can stop Copilot reaching its servers.</li>
</ul>
<h2>Remote and SSH sessions</h2>
<p>Cursor’s documentation notes that AI requests go from your own machine to Cursor, not from the remote host. When working over SSH, your local internet connection is what matters.</p>
<h2>Copilot at work is a different product</h2>
<p>Microsoft’s troubleshooting article for Copilot in Microsoft 365 apps lists causes unrelated to outages: a newly assigned licence that has not taken effect, being signed in with both a personal and a work account, device-based licensing, the wrong update channel, and privacy settings that block connected experiences. Our <a href="/is-copilot-down">Microsoft Copilot page</a> covers the consumer app, not this one.</p>
<h2>How to tell it is your network</h2>
<p>If our page and the provider’s status page both look healthy, try the same tool on mobile data or a home connection. If it works there, take the details above to your IT team. If it fails everywhere, read <a href="/guides/ai-chatbot-not-working">what to do when an AI chatbot stops working</a>.</p>
${sourcesBlock([
  ['Cursor network troubleshooting', 'https://cursor.com/help/troubleshooting/network'],
  ['Cursor common issues', 'https://cursor.com/docs/troubleshooting/common-issues'],
  ['GitHub Docs: troubleshooting network errors for Copilot', 'https://docs.github.com/en/copilot/how-tos/troubleshoot-copilot/troubleshoot-network-errors'],
  ['Microsoft Learn: Copilot is missing, disabled, or does not work correctly (Microsoft 365)', 'https://learn.microsoft.com/en-us/office/troubleshoot/copilot/copilot-missing-disabled-not-work-correctly'],
])}`,
  },
  {
    id: 'ai-service-blocked-region-or-network',
    title: 'AI service up but not loading? Is it a regional or network block?',
    seoTitle: 'AI up but not loading? Network or region block',
    description:
      'Our status says an AI service is up but you cannot get in. How to tell a network or regional problem from an outage, and what a VPN can and cannot show.',
    html: () => `
<h1>AI service up but not loading? Is it a regional or network block?</h1>
<p class="lede">When our page and the provider’s page both say a service is working and it still will not load for you, the cause is often somewhere between you and the service. This guide helps you find where.</p>
<h2>What our check can and cannot see</h2>
<p>Our test runs from Cloudflare’s network, in one place. It can tell you whether the service answers there and what the provider reports. It cannot tell you whether the service is reachable from your country, your internet provider or your office. “Operational” on our page means “reachable and healthy from where we check”, not “working for you”.</p>
<h2>1. Change one thing: the network</h2>
<p>Try the same service on a different connection, such as mobile data in place of home Wi-Fi, with nothing else changed.</p>
<ul>
<li><strong>It works on the other network.</strong> The problem is the first network: a filter on a work, school or public connection, your router, or your internet provider. Our guide on <a href="/guides/ai-tools-fail-on-work-networks">why AI tools fail on work networks</a> lists what an IT team can check.</li>
<li><strong>It fails on every network.</strong> The cause is more likely your account, a usage limit, your browser, or the service not being available where you are. Work through <a href="/guides/ai-chatbot-not-working">what to do when an AI chatbot stops working</a>.</li>
</ul>
<h2>2. Is the service available in your country?</h2>
<p>Providers do not offer every service everywhere. OpenAI’s documentation, for example, says its API returns a 403 error when the country, region or territory is not supported. If you are travelling, or you recently moved, check the provider’s own list of supported countries before assuming a fault.</p>
<h2>3. Could it be a regional incident?</h2>
<p>Traffic goes through different data centres in different places, and a provider’s status page can report a partial outage that affects only some users or regions. Read the latest incident text on the provider’s page and on <a href="/">our service pages</a>, which name the affected components. If an incident is listed, wait for the update.</p>
<h2>4. Where a VPN fits</h2>
<p>A VPN sends your traffic through a server in another place, so a website sees that location in place of yours. For troubleshooting, that makes it a test, not a cure. If a service loads over a VPN and not without one, the problem is probably on your usual network or with your internet provider, not with the service. If it fails both ways, you have ruled that out.</p>
<h2>5. When a VPN is worth having</h2>
<p>Beyond troubleshooting, a VPN is a sensible tool in some everyday situations:</p>
<ul>
<li><strong>On public Wi-Fi.</strong> In a café, hotel or airport, a VPN encrypts the connection between your device and the VPN’s server, so others on the same network cannot see what you are doing. Most websites already use HTTPS, which protects the content of what you send, so the gain is smaller than some advertising suggests, but it is a useful extra layer on a network you do not trust.</li>
<li><strong>Working remotely.</strong> Many employers provide a VPN so staff can reach internal systems securely from home or abroad. If yours does, use it as instructed.</li>
<li><strong>Keeping your browsing from your internet provider.</strong> A VPN hides which sites you visit from your internet provider and from the local network. It does not make you invisible: the VPN company can see that information in their place, so you are choosing whom to trust.</li>
<li><strong>Travelling.</strong> Some people use a VPN abroad to reach services as they would at home. Check the service’s terms first, because some do not allow it.</li>
<li><strong>Where access is restricted by the authorities.</strong> In places where sites are blocked, a VPN can be an important way to reach information. Local law and the risks to the person using it vary a great deal, so it is worth understanding both.</li>
</ul>
<p>Used for a clear reason and from a provider you have checked, a VPN can be well worth the small cost.</p>
<h2>6. Cautions before you use one</h2>
<ul>
<li><strong>Do not use a VPN to get round a country restriction.</strong> If a provider does not offer its service in your country, using a VPN to get in may break its terms. Check them first.</li>
<li><strong>A VPN can be the cause.</strong> Cursor’s documentation says a VPN can trigger a “suspicious activity” block, and GitHub lists VPNs among the things that can stop Copilot reaching its servers. If it only fails while a VPN is on, switch the VPN off.</li>
<li><strong>A VPN adds a company that sees where your traffic goes.</strong> Read its privacy policy, and be wary of free services.</li>
<li><strong>Do not bypass a work or school network</strong> without permission from whoever runs it.</li>
</ul>
<h2>7. What to tell support or your IT team</h2>
<p>Write down the exact error message, the time (with your time zone), which network you were on, what worked on another network, and whether our page and the provider’s page showed a problem. That saves them a round of questions.</p>
<p>Still stuck? Read <a href="/guides/status-page-says-up-but-broken">why a service can be up but broken for you</a>.</p>
${sourcesBlock([
  ['OpenAI API error codes', 'https://developers.openai.com/api/docs/guides/error-codes'],
  ['Cursor network troubleshooting', 'https://cursor.com/help/troubleshooting/network'],
  ['GitHub Docs: troubleshooting network errors for Copilot', 'https://docs.github.com/en/copilot/how-tos/troubleshoot-copilot/troubleshoot-network-errors'],
])}`,
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
  // Titles over about 60 characters get cut in search results: use the short form, or drop the site name.
  const base = g.seoTitle || g.title;
  const withSite = `${base} | Is AI Down?`;
  return page(env, `/guides/${g.id}`, withSite.length <= 60 ? withSite : base, g.description, g.html(), {
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

const FAQS = () => [
  [
    'How does Is AI Down? decide that a service is down?',
    'We combine two signals every five minutes: the provider’s own status page, where one can be read by machine, and our own test that sends a plain request to the service. Our test on its own can never mark a service “down” while the provider’s status page says it is fine. The full method is in <a href="/guides/how-we-check">how we check</a>.',
  ],
  [
    'How often are the checks run?',
    'Every five minutes. Each page shows when the last check ran.',
  ],
  [
    'Why does a service say “having issues” and not “down”?',
    '“Having issues” means the provider reports a problem with part of the service, or our checks have failed more than once in a row. We only say “down” when the provider reports a major outage of its core service or, for services with no readable status feed, our checks have failed for about fifteen minutes in a row.',
  ],
  [
    'The site says a service is up, but it does not work for me. Why?',
    'A verdict describes the service as a whole. It cannot see your account, your network, your region or whether you have reached a usage limit. Read <a href="/guides/status-page-says-up-but-broken">why a service can be up but broken for you</a>, then work through <a href="/guides/ai-chatbot-not-working">what to do when an AI chatbot stops working</a>.',
  ],
  [
    'Which services do you cover?',
    `${PLATFORMS.map((p) => esc(p.name)).join(', ')}. Each has its own page, and the home page shows them all together.`,
  ],
  [
    'Why do some pages say they rely on our own checks?',
    'Microsoft Copilot, Grok and DeepSeek publish no status feed that a script can read, so those verdicts rest on our own checks and the page says so. Google publishes no feed for the Gemini app itself, so for Gemini we read Google Cloud’s incident list for Gemini and Vertex AI and combine it with our own checks.',
  ],
  [
    'Can you tell me how fast or how good an AI service is?',
    'No. We can only tell whether a service responds and what its provider reports. We cannot measure how slow it is, or how good its answers are.',
  ],
  [
    'A verdict looks wrong, or I want another service added. What should I do?',
    'Tell us through the <a href="/contact">contact page</a>. Please include the service name and roughly when you saw the problem.',
  ],
  [
    'Are you connected to OpenAI, Anthropic, Google or the other companies?',
    'No. Is AI Down? is independent. We use the companies’ names only to say which service a page is about.',
  ],
  [
    'Can I use your data in my own project?',
    'Yes, for reasonable use. It is available as JSON at <a href="/api/status.json">/api/status.json</a>, with one file per service. Heavy use may be rate limited, and the <a href="/terms">terms</a> ask you to link back to us if you republish it.',
  ],
  [
    'How is the site paid for?',
    'We plan to show advertising. Advertising never changes a verdict.',
  ],
  [
    'Do you collect my personal data?',
    'We do not ask for accounts or personal details and we do not set our own cookies. Our hosting provider processes technical information about each request, we use Cloudflare Web Analytics to count page views, and advertising partners may use cookies once ads are shown. The <a href="/privacy">privacy policy</a> has the detail.',
  ],
];

export function faqPage(env) {
  const faq = FAQS();
  const plain = (h) => h.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&');
  return page(
    env,
    '/faq',
    'Frequently asked questions | Is AI Down?',
    'Answers to common questions about how Is AI Down? checks ChatGPT, Claude, Gemini and other AI services, and what its verdicts mean.',
    `<h1>Frequently asked questions</h1>
${faq.map(([q, a]) => `<h2>${esc(q)}</h2>\n<p>${a}</p>`).join('\n')}
<p>Something not answered here? Use the <a href="/contact">contact page</a>.</p>`,
    {
      ld: [
        {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: plain(a) } })),
        },
      ],
    },
  );
}

export function aboutPage(env) {
  return page(
    env,
    '/about',
    'About Is AI Down? Who runs it and how it works',
    'What Is AI Down? is, how it works, and how to contact us.',
    `<h1>About Is AI Down?</h1>
<p>Is AI Down? (aiisdown.com) is a small, independent website that tells you whether the main AI services are working. It currently covers ${PLATFORMS.map((p) => esc(p.name)).join(', ')}.</p>
<p>Every five minutes we read each provider’s own status page, where one is available, and test whether the service answers. The page for each service shows both signals side by side, so you can see why we are saying what we say. The full method is in <a href="/guides/how-we-check">how we check</a>.</p>
<p>The site is run by ${operator(env)}. It is funded by advertising, which never changes a verdict. We are not affiliated with any of the companies we cover.</p>
<p>Spotted a wrong verdict, or want another service added? Tell us through the <a href="/contact">contact page</a>.</p>`,
    {
      ld: [
        {
          '@context': 'https://schema.org',
          '@type': 'AboutPage',
          name: 'About Is AI Down?',
          url: `${env.SITE_URL}/about`,
          inLanguage: 'en-GB',
          about: { '@id': orgId(env) },
        },
        orgLd(env),
      ],
    },
  );
}

export function privacyPage(env) {
  return page(
    env,
    '/privacy',
    'Privacy policy | Is AI Down?',
    'What data Is AI Down? collects, who processes it and your rights.',
    `<h1>Privacy policy</h1>
<p class="muted">Last updated: 10 October 2026</p>
<p>This website is run by Michael Theodore, trading as Is AI Down? You can reach us at hello@aiisdown.com.</p>
<h2>What we collect</h2>
<p>We do not ask you to create an account or give us any personal details, and we do not set our own cookies. Like any website, our hosting provider, Cloudflare, processes technical information about each request, such as your IP address, browser type and the page requested, in order to deliver the site, keep it secure and measure load. We do not use this to identify you.</p>
<p>We also use Cloudflare Web Analytics, which counts page views and measures how quickly pages load by means of a small script. Cloudflare states that it does not use cookies or local storage to collect these measurements.</p>
<h2>Advertising</h2>
<p>This site is funded by advertising supplied by Google AdSense. Google and its partners may use cookies and similar technologies to show and measure ads and, where you consent, to personalise them. Third parties, including Google, may place and read cookies on your browser, or use web beacons or IP addresses, to collect information as a result of ads being served on this website. In the UK and European Economic Area you will be asked for your consent before personalised advertising is used. You can learn how Google uses data from sites that use its services at <a href="https://policies.google.com/technologies/partner-sites" rel="noopener">policies.google.com/technologies/partner-sites</a> and manage ad personalisation at <a href="https://adssettings.google.com" rel="noopener">adssettings.google.com</a>.</p>
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
<p class="muted">Last updated: 7 October 2026</p>
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
    'Contact Is AI Down? Report a wrong verdict',
    'How to contact Is AI Down? about a wrong verdict, a missing service or anything else.',
    `<h1>Contact</h1>
<p>Found a verdict that looks wrong, or want a service added? We would like to hear about it. Please include the service name and roughly when you saw the problem.</p>
${mail}
${address(env) ? `<p>Post: ${operator(env)}, ${address(env)}</p>` : ''}`,
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
