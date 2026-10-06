# aiisdown

Live status of the main AI services (ChatGPT, Claude, Gemini, Perplexity, Microsoft Copilot, Grok, DeepSeek, Mistral Le Chat, GitHub Copilot, Cursor), built to run on Cloudflare's free plan and earn from display ads.

One Worker does everything:

- **Cron, every five minutes.** Reads each provider's own status feed where one can be read by a script, sends its own request to each service's website and API, fuses the two into one verdict, and writes the result to D1.
- **Pages.** Server-rendered from D1: a home page, one page per service at `/is-<slug>-down`, three guides, and the legal pages AdSense expects.
- **JSON.** `/api/status.json` and `/api/<slug>.json`, plus `llms.txt` and a sitemap.
- **Static assets** (`public/`) are free and unlimited on Cloudflare.

## How verdicts are decided

See `src/verdict.js` and the public explanation in `src/content.js` (the "how we check" guide). The rules that matter:

- Our own probe can never mark a service "down" while a readable official feed says it is fine (it can only say "having issues").
- A probe that has never once succeeded is treated as blocked, not as an outage. This is the classic status-checker bug: reporting a healthy site as dead because it refuses scripts.
- A 401, 403 or 429 counts as reachable. Only 5xx, timeouts and connection failures count as failures.
- Two failed checks in a row are needed before anything changes. With no readable feed, three in a row (about 15 minutes) means "down".
- If every check in a run fails, the run is discarded as our own fault.
- Page-wide incidents on shared status pages (OpenAI covers ChatGPT and the API) are shown but do not change the verdict.

Services with no readable feed (Copilot, Grok, DeepSeek, Mistral if its page blocks scripts) say so on the page.

## Cost

Nothing but the domain. Free plan limits, as of October 2026: 100,000 Worker requests a day (the site returns an error page past that, it does not bill), 50 outgoing requests per cron run (we use about 30), 5 cron triggers per account (we use 1), D1 100,000 row writes a day (we use about 3,000). Static assets are free. Check [Cloudflare's limits page](https://developers.cloudflare.com/workers/platform/limits/) if you add services.

## Run it locally

```
npm install
npm test
npm run db:local
npm run dev                  # http://127.0.0.1:8787
curl "http://127.0.0.1:8787/__scheduled?cron=*%2F5+*+*+*+*"   # run the checks once
```

## Deploy

1. `npx wrangler login`
2. `npx wrangler d1 create aiisdown`, then add the printed `database_id` to the `d1_databases` entry in `wrangler.jsonc`.
3. `npm run db:remote` then `npm run deploy`. The site is live at `aiisdown.<your-subdomain>.workers.dev` and marks itself `noindex` while it is on that address.
4. Buy `aiisdown.com`, add it to Cloudflare as a site, change the nameservers at the registrar, then in the dashboard open Workers & Pages, aiisdown, Settings, Domains & Routes and add `aiisdown.com` as a custom domain. Update `SITE_URL` in `wrangler.jsonc` if you use a different domain, and the `Sitemap:` line in `public/robots.txt` and the links in `public/llms.txt`.

## Before applying to AdSense

- Set `OPERATOR_NAME` and `CONTACT_EMAIL` in `wrangler.jsonc`. The contact page says "being set up" until you do, which AdSense will not like.
- Have the privacy policy and terms (`src/content.js`) read by someone qualified. They are a sensible starting point, not legal advice.
- In AdSense, switch on Privacy & messaging and publish Google's consent message for the UK and EEA. Personalised ads need consent there.
- Put your publisher line in `public/ads.txt`.
- Set `ADSENSE_CLIENT` (`ca-pub-...`) and, once you have created ad units, `ADSENSE_SLOT_TOP` and `ADSENSE_SLOT_INLINE`. Nothing ad-related loads until `ADSENSE_CLIENT` is set.
- Do not add auto-refresh to pages. Refreshing to inflate impressions breaks AdSense policy.
- Let the site build some history and traffic first. Thin new sites are often rejected on the first try.

## Adding a service

Add an entry to `src/platforms.js`. Check the feed first: `curl <status-url>/api/v2/summary.json`. Services without a feed need at least one `core: true` probe. Add the page to `public/llms.txt`.

## Notes and limits

- Verdicts describe reachability and what the provider reports. They cannot see your account, your region, usage limits or answer quality.
- Probes run from Cloudflare's network, which some sites treat suspiciously. If a probe never succeeds the page says so and ignores it.
- Provider names are used only to say which service a page is about. Do not add provider logos.
