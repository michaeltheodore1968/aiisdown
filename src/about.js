// Per-service explanatory content for the service pages.
//
// Every factual claim here comes from the provider's own documentation or
// status page, listed in `sources`, or describes how our own checks work
// (see platforms.js). Do not add claims that are not backed by one of those.
// Provider component names are as listed on each status page on 8 October 2026
// and can change.
//
// Shape:
//   intro   : paragraphs, shown under "How ${name} fails"
//   parts   : [name, text] pairs describing what the provider lists separately
//   errors  : [label, text] pairs from the provider's own error documentation
//   errorsIntro : one sentence introducing the errors list
//   faq     : extra [question, answer] pairs (also used in the page's FAQ markup)
//   sources : [label, url] pairs
// Plain text only: it is escaped when rendered.

export const WRITTEN_ON = '8 October 2026';

export const ABOUT = {
  chatgpt: {
    intro: [
      "ChatGPT is one product on a status page that covers much more. OpenAI's page lists the developer platform (Chat Completions, Responses, Embeddings, Images, Batch, Audio, Realtime, Files and others) alongside the ChatGPT product itself. A fault in one group does not always touch the other, so \"OpenAI has a problem\" and \"ChatGPT is down\" are not the same statement.",
      "Our verdict follows the ChatGPT components, and a major outage of Conversations or Login is what makes us say \"down\". The developer platform components are not counted. Incidents that OpenAI posts for the whole page are shown for information but never change the verdict. We also test chatgpt.com ourselves every five minutes.",
    ],
    parts: [
      ['Login and Conversations', 'Signing in and holding a chat. These two decide whether we call ChatGPT down.'],
      ['Voice mode, File uploads, Image Generation, Search, Deep Research, Agent, GPTs', 'Individual features. A problem here marks ChatGPT as having issues, because the main chat may still work.'],
      ['Developer platform', 'The API components. Not counted in our verdict.'],
    ],
    errorsIntro: "If you use the OpenAI API, these are the errors OpenAI documents. The number alone does not tell you whether OpenAI is at fault.",
    errors: [
      ['401', 'Authentication problem: a wrong or outdated key, a missing organisation, or a request from an IP address that is not on your allowlist. Not an outage.'],
      ['403', 'Access is refused from your country, region or territory. Not an outage.'],
      ['429', 'Several different causes: a rate limit reached, credit used up, a spend limit hit, a "slow down" signal after traffic grew too fast, or a usage quota. All are about your account, not a service fault.'],
      ['500', 'A server error on OpenAI\'s side. OpenAI suggests retrying after a short wait and checking the status page if it continues.'],
      ['503', 'The model is temporarily overloaded. This is on OpenAI\'s side. OpenAI suggests following the retry headers and backing off.'],
    ],
    faq: [
      ['Is ChatGPT the same as the OpenAI API?', "No. They appear as separate groups of components on OpenAI's status page, and a problem with one may not affect the other. Our ChatGPT verdict follows the ChatGPT components only."],
      ['Does a 429 error mean ChatGPT is down?', "Not necessarily. OpenAI's documentation lists several reasons for a 429, including rate limits, spend limits and used-up credit. Those are limits on your account, not a fault with the service."],
    ],
    sources: [
      ['OpenAI status page', 'https://status.openai.com'],
      ['OpenAI API error codes', 'https://developers.openai.com/api/docs/guides/error-codes'],
    ],
  },

  claude: {
    intro: [
      "Anthropic's status page lists Claude's parts separately: claude.ai, the Claude Console (platform.claude.com), the Claude API, Claude Code, Claude Cowork and Claude for Government. One can be struggling while the rest work normally.",
      "Our verdict counts claude.ai, the API, Claude Code and Claude Cowork, and a major outage of claude.ai is what makes us say \"down\". A problem with the Console alone, or with Claude for Government, is named on this page but does not change the verdict, because it would not affect most people using Claude. We also test claude.ai ourselves every five minutes.",
    ],
    parts: [
      ['claude.ai', 'The chat website and apps. This decides whether we call Claude down.'],
      ['Claude API and Claude Code', 'Developer access and the coding tool. Counted in our verdict.'],
      ['Claude Cowork', 'Counted in our verdict.'],
      ['Claude Console', 'The developer console. Shown if it has a problem, but not counted.'],
      ['Claude for Government', 'Not counted.'],
    ],
    errorsIntro: "If you use the Claude API, these are the errors Anthropic documents.",
    errors: [
      ['400', 'The request has a problem, or a spend limit you set has been reached.'],
      ['401', 'A problem with your API key.'],
      ['402', 'A billing or payment problem.'],
      ['403', 'Your key does not have permission for that resource.'],
      ['413', 'The request is larger than the allowed size.'],
      ['429', 'Your organisation hit a rate limit or its monthly spend cap. A spend-cap 429 carries no retry delay and keeps failing until access resumes.'],
      ['500', 'An unexpected error inside Anthropic\'s systems. Anthropic suggests retrying with exponential backoff.'],
      ['504', 'The request timed out while being processed.'],
      ['529', 'The API is temporarily overloaded. Anthropic says this can happen when traffic is high across all users.'],
    ],
    faq: [
      ['What does a 529 error from Claude mean?', "Anthropic documents 529 as the API being temporarily overloaded, which can happen when traffic is high across all users. It points to the service, not to your account."],
      ['Why can the Claude Console be degraded while Claude is operational?', "They are separate components on Anthropic's status page. The Console is the developer dashboard. If only the Console has a problem, we name it on this page but still show Claude as operational, because claude.ai and the API are what most people use."],
    ],
    sources: [
      ['Claude status page', 'https://status.claude.com'],
      ['Claude API errors', 'https://platform.claude.com/docs/en/api/errors'],
    ],
  },

  gemini: {
    intro: [
      "Google does not publish a status feed for the Gemini app itself. What it does publish is the Google Cloud incident list, which covers Gemini and Vertex AI among many other products. We read that list and keep only open incidents that mention Gemini or Vertex AI, then combine them with our own check of gemini.google.com.",
      "That means a quiet Google Cloud list does not prove the Gemini app is working, and an open Google Cloud incident may affect developers more than app users. A Google Cloud incident can be limited to certain regions, so we report one as \"having issues\" and never as \"down\".",
    ],
    parts: [
      ['Google Cloud incidents', 'Open incidents that mention Gemini or Vertex AI. These count towards the verdict.'],
      ['gemini.google.com', 'Our own check of the Gemini website. This can change the verdict.'],
      ['Gemini API', 'We also test generativelanguage.googleapis.com for information. It is shown but does not change the verdict.'],
    ],
    errorsIntro: "If you use the Gemini API, Google's troubleshooting guide separates errors worth retrying from errors that are about your request.",
    errors: [
      ['429 RESOURCE_EXHAUSTED', 'You have exceeded a rate limit or quota. Google calls it transient and suggests retrying with exponential backoff.'],
      ['503 UNAVAILABLE', 'The service is temporarily unreachable or overloaded. Retry with backoff.'],
      ['408', 'The request took too long. Retry.'],
      ['Other 5xx', 'Backend problems on Google\'s side, treated as worth retrying.'],
      ['400, 402, 403', 'Problems with the request itself, such as an invalid key, no credit or a malformed request. Retrying will not fix them.'],
    ],
    faq: [
      ['Does Google have a status page for the Gemini app?', "Not one that we can read. Google publishes Google Cloud incidents that mention Gemini and Vertex AI, and we combine those with our own check of the Gemini website."],
      ['Why does Gemini never show as down for a Google Cloud incident?', "Google Cloud incidents can affect only some regions or customers, so we always report one as \"having issues\" and never as \"down\"."],
    ],
    sources: [
      ['Google Cloud status', 'https://status.cloud.google.com'],
      ['Gemini API troubleshooting guide', 'https://ai.google.dev/gemini-api/docs/troubleshooting'],
    ],
  },

  perplexity: {
    intro: [
      "Perplexity's status page lists four components: Website, App, Computer and API. Our verdict counts the Website and the App, and a major outage of either is what makes us say \"down\". We also test perplexity.ai ourselves every five minutes, and api.perplexity.ai for information only.",
      "If the Website is fine and only the API has a problem, we leave Perplexity as operational for people using it as a search tool.",
    ],
    parts: [
      ['Website and App', 'How most people use Perplexity. Counted in our verdict.'],
      ['Computer', 'Listed on the status page.'],
      ['API', 'For developers. Shown if it has a problem, but not counted.'],
    ],
    errorsIntro: "If you use the Perplexity API, its documentation separates errors you should fix from errors you can retry.",
    errors: [
      ['400', 'A parameter in the request is wrong. Fix it before trying again.'],
      ['401', 'A missing or invalid API key.'],
      ['403', 'You do not have permission for that resource.'],
      ['404', 'The resource does not exist.'],
      ['429', 'A rate limit has been reached. Retry with exponential backoff, and avoid tight retry loops, which make throttling worse.'],
      ['500 and above', 'A temporary problem on the service side. Retrying with backoff is appropriate.'],
    ],
    faq: [
      ['Is the Perplexity API part of your verdict?', "No. We count the Website and App components. If the API alone has a problem, we show it but still call Perplexity operational."],
    ],
    sources: [
      ['Perplexity status page', 'https://status.perplexity.com'],
      ['Perplexity SDK error handling', 'https://docs.perplexity.ai/guides/perplexity-sdk-error-handling'],
    ],
  },

  copilot: {
    intro: [
      "This page is about the consumer Copilot app at copilot.microsoft.com, not Copilot inside Microsoft 365 at work. Microsoft publishes no status feed that we can read for the consumer app, so this verdict rests on our own check of copilot.microsoft.com every five minutes. We say \"down\" only after about fifteen minutes of consecutive failures.",
      "Microsoft's wider service-health pages cover its business products, so a quiet status page does not prove the consumer app is working, and a problem there may not affect it. We cannot see licence, account or work-network problems either.",
    ],
    parts: [
      ['copilot.microsoft.com', 'Our own check of the consumer Copilot website. This is the only signal for this page.'],
      ['Microsoft status page', 'We link to it, but it cannot be read by a script, so it does not feed the verdict.'],
    ],
    errorsTitle: 'If you use Copilot at work',
    errorsIntro: "If you use Copilot inside Microsoft 365 apps at work, a different set of problems applies. Microsoft's own troubleshooting article for that product (now archived) lists these causes when Copilot is missing, disabled or not working.",
    errors: [
      ['A newly assigned licence', 'A new licence can take time to take effect, so Copilot may not appear straight away.'],
      ['Account conflicts', 'Being signed in with both a personal account and a work or school account can stop Copilot validating.'],
      ['Internet connection', 'Copilot needs the network requirements Microsoft publishes to be met.'],
      ['A recent Office reset or update', 'This can affect your Office activation status.'],
      ['Device-based licensing', 'Copilot is not available with device-based licensing. A user-based licence is needed.'],
      ['Update channel', 'Your organisation must use Current Channel or Monthly Enterprise Channel.'],
      ['Privacy settings', 'Copilot can be blocked by privacy controls for connected experiences.'],
    ],
    faq: [
      ['Is this page about Microsoft 365 Copilot?', "No. It covers the consumer Copilot app at copilot.microsoft.com. Copilot in Microsoft 365 at work depends on licences, update channels and organisation policies that we cannot see, so ask your Microsoft 365 administrator."],
      ['Why does this page say it relies on your own checks?', "Because Microsoft publishes no status feed we can read for the consumer app. Our check of copilot.microsoft.com is the only signal, and we wait for about fifteen minutes of failures before saying \"down\"."],
    ],
    sources: [
      ['Microsoft service status', 'https://status.cloud.microsoft'],
      ['Microsoft Learn: Copilot is missing, disabled, or does not work correctly (Microsoft 365)', 'https://learn.microsoft.com/en-us/office/troubleshoot/copilot/copilot-missing-disabled-not-work-correctly'],
    ],
  },

  grok: {
    intro: [
      "xAI's status page cannot be read by a script, so this verdict rests on our own checks. Every five minutes we test both grok.com and the developer API at api.x.ai, and either one failing can count. We say \"down\" only after about fifteen minutes of consecutive failures.",
      "Because there is no official feed to compare against, this page is more likely than most to be wrong in the first minutes of a real fault, and it says so on the page.",
    ],
    parts: [
      ['grok.com', 'Our check of the Grok website. Counts towards the verdict.'],
      ['api.x.ai', 'Our check of the developer API. Also counts towards the verdict.'],
    ],
    errorsIntro: "If you use the xAI API, these are the errors xAI documents.",
    errors: [
      ['400', 'The request contains invalid data. Check its structure and the URL path.'],
      ['401', 'Authentication failed or is missing. Send your API key as a Bearer token, and create a new key in the xAI Console if needed.'],
      ['403', 'You do not have permission for the resource. xAI suggests asking your team administrator.'],
      ['404', 'The resource does not exist. Check the endpoint against the API reference.'],
      ['405', 'The HTTP method is not supported for that endpoint.'],
      ['415', 'The content type of the request is not accepted.'],
      ['422', 'A field in the request has an invalid format or value.'],
      ['429', 'You are sending requests too fast. Slow down or raise your rate limit in the xAI Console.'],
    ],
    faq: [
      ['Why can you not use xAI\'s status page?', "Its status page cannot be read by a script, so we cannot compare our own checks against it. This page relies on our checks of grok.com and the API."],
    ],
    sources: [
      ['xAI status page', 'https://status.x.ai'],
      ['xAI API debugging guide', 'https://docs.x.ai/docs/key-information/debugging'],
    ],
  },

  deepseek: {
    intro: [
      "DeepSeek publishes no status feed that we can read, so this verdict rests on our own checks. Every five minutes we test chat.deepseek.com and api.deepseek.com, and either failing can count. We say \"down\" only after about fifteen minutes of consecutive failures.",
      "Several DeepSeek errors that look like outages are really about your account. A 402, for example, means your balance has run out.",
    ],
    parts: [
      ['chat.deepseek.com', 'Our check of the chat website. Counts towards the verdict.'],
      ['api.deepseek.com', 'Our check of the developer API. Also counts towards the verdict.'],
    ],
    errorsIntro: "If you use the DeepSeek API, these are the errors DeepSeek documents.",
    errors: [
      ['400', 'The request format is invalid. Fix it using the error message.'],
      ['401', 'Authentication failed because the API key is wrong or missing.'],
      ['402', 'Insufficient balance. Your account has run out of funds, so add credit.'],
      ['422', 'The request parameters are invalid.'],
      ['429', 'You are sending requests too quickly. Slow down.'],
      ['500', 'A server problem on DeepSeek\'s side. Wait briefly and retry.'],
      ['503', 'The server is overloaded by demand. Try again after a short wait.'],
    ],
    faq: [
      ['What does DeepSeek error 402 mean?', "DeepSeek documents 402 as insufficient balance: your account has run out of funds. It is a billing matter, not an outage."],
      ['What does error 503 mean on DeepSeek?', "DeepSeek documents 503 as the server being overloaded by high demand, and suggests waiting a few moments before trying again. It points to the service, not your account."],
    ],
    sources: [
      ['DeepSeek status page', 'https://status.deepseek.com'],
      ['DeepSeek API error codes', 'https://api-docs.deepseek.com/quick_start/error_codes/'],
    ],
  },

  mistral: {
    intro: [
      "Mistral's status page is read by our checks where it allows scripts, and we also test chat.mistral.ai, Le Chat's website, every five minutes. We test api.mistral.ai too, but for information only: it does not change the verdict.",
      "If Mistral's status page cannot be read for a while, the page says so and leans on our own checks.",
    ],
    parts: [
      ['chat.mistral.ai', 'Our check of Le Chat, the chat website. This can change the verdict.'],
      ['api.mistral.ai', 'Our check of the developer API. Shown for information only.'],
    ],
    errorsIntro: "If you use the Mistral API, its error glossary lists these responses.",
    errors: [
      ['400', 'The request is malformed or has invalid parameters.'],
      ['401', 'Your credentials are missing, invalid or expired.'],
      ['403', 'You lack permission for the resource.'],
      ['404', 'The endpoint or resource does not exist.'],
      ['422', 'The request failed validation. The error details say which fields are wrong.'],
      ['429', 'You have exceeded rate limits. Use exponential backoff or send fewer requests.'],
      ['500', 'An unexpected failure on the server. Retry with backoff.'],
      ['502', 'A gateway received an invalid response upstream. Wait and retry.'],
      ['503', 'The service is temporarily down or overloaded. Retry with backoff.'],
      ['504', 'The server did not respond in time. Retry with backoff.'],
    ],
    faq: [
      ['Is Le Chat the same as the Mistral API?', "No. Le Chat is the chat website. We test the website for the verdict, and the API only for information."],
      ['What does a 422 error from Mistral mean?', "Mistral documents 422 as a validation error: the request failed checks on its data. It is about the request you sent, not an outage."],
    ],
    sources: [
      ['Mistral status page', 'https://status.mistral.ai'],
      ['Mistral error glossary', 'https://docs.mistral.ai/resources/error-glossary'],
    ],
  },

  'github-copilot': {
    intro: [
      "GitHub's status page covers the whole of GitHub: Git operations, webhooks, the API, issues, pull requests, Actions, packages, Pages, Codespaces, Copilot and a separate component for Copilot's AI model providers. We count only the Copilot component for this page, so an Actions outage does not mark Copilot as having issues. We run no check of our own for this one, so this page follows the official feed.",
      "Page-wide incidents from GitHub are shown for information but do not change the verdict.",
    ],
    parts: [
      ['Copilot', 'The component we count in the verdict.'],
      ['Other GitHub components', 'Actions, Pages, Codespaces and others are not counted.'],
    ],
    errorsTitle: 'Network problems that look like outages',
    errorsIntro: "Most Copilot problems that are not outages come from the network. GitHub's own documentation on network errors describes these.",
    errors: [
      ['read ETIMEDOUT or read ECONNRESET', 'Connectivity failures, often caused by a corporate proxy blocking Copilot.'],
      ['certificate signature failure, unable to verify the first certificate', 'A proxy that inspects encrypted traffic, using a certificate your machine does not recognise.'],
      ['Proxy settings', 'GitHub says Copilot does not support proxies whose address begins with https://, and needs basic or Kerberos authentication where one is required.'],
      ['VPNs and firewalls', 'These can stop Copilot reaching GitHub. GitHub publishes an allowlist for firewalls and suggests testing the connection with curl.'],
    ],
    faq: [
      ['Why does a GitHub Actions outage not show here?', "GitHub's status page covers many products. We count only its Copilot component, so an outage elsewhere on GitHub does not turn this page amber."],
      ['Copilot fails at work but not at home. Why?', "Corporate proxies, custom certificates, VPNs and firewalls are the usual causes, according to GitHub's documentation on Copilot network errors. Your IT team can check the proxy and firewall settings."],
    ],
    sources: [
      ['GitHub status page', 'https://www.githubstatus.com'],
      ['GitHub Docs: troubleshooting network errors for Copilot', 'https://docs.github.com/en/copilot/how-tos/troubleshoot-copilot/troubleshoot-network-errors'],
    ],
  },

  cursor: {
    intro: [
      "Cursor's status page lists separate components: Automations, Review Agents, CLI, Cloud Agents, cursor.com, the IDE, Origin and Grok Bot. We treat cursor.com and the IDE as the core of the service, and a major outage of either is what makes us say \"down\". A problem with one of the other components marks Cursor as having issues. We also test cursor.com ourselves every five minutes.",
    ],
    parts: [
      ['cursor.com and IDE', 'The website and the editor itself. These decide whether we call Cursor down.'],
      ['CLI, Cloud Agents, Review Agents, Automations, Origin, Grok Bot', 'Other parts. A problem here marks Cursor as having issues, not down.'],
    ],
    errorsTitle: 'Network problems that look like outages',
    errorsIntro: "Many Cursor problems that look like outages are network problems. Cursor's own troubleshooting pages describe these.",
    errors: [
      ['A corporate proxy blocks HTTP/2', 'Cursor streams responses over HTTP/2, and some corporate proxies, such as Zscaler, block it. Cursor suggests switching the HTTP compatibility mode to HTTP/1.1 in the network settings and restarting.'],
      ['A firewall blocks Cursor\'s domains', 'Cursor lists cursor.sh, cursor-cdn.com, cursorapi.com and cursorvm.com, including subdomains, as domains to allow.'],
      ['Remote or SSH sessions', 'AI requests go from your own machine to Cursor, not from the remote host, so your local connection matters.'],
      ['Stale DNS after a VPN', 'After disconnecting from a VPN, fully restart Cursor, not just reload the window, so old DNS settings are cleared.'],
      ['"Suspicious activity" blocks', 'A VPN can trigger these. Cursor suggests turning it off, starting a fresh chat or signing in another way.'],
    ],
    faq: [
      ['Cursor says connection failed but your page says operational. What should I try?', "Cursor has a built-in network diagnostics tool in its settings. Cursor's documentation also suggests switching to HTTP/1.1 compatibility mode if you are behind a corporate proxy, and checking that its domains are allowed through your firewall."],
      ['Why is my Cursor page amber when the editor works?', "We count a problem with any listed component as 'having issues', and only a major outage of cursor.com or the IDE as 'down'. The page names the component affected."],
    ],
    sources: [
      ['Cursor status page', 'https://status.cursor.com'],
      ['Cursor network troubleshooting', 'https://cursor.com/help/troubleshooting/network'],
      ['Cursor common issues', 'https://cursor.com/docs/troubleshooting/common-issues'],
    ],
  },
};
