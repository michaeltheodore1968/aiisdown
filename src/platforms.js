// The services we watch. Everything about how each one is checked lives here.
//
// feed    : the vendor's own status feed, if one can be read by a script.
//   type 'statuspage' reads <host>/api/v2/summary.json (also used by incident.io
//        and Instatus pages). `include` limits it to named components; `core`
//        names the components whose major outage means the whole service is down.
//        `incidents: 'info'` shows page-wide incidents without letting them
//        change the verdict (used when the page covers more than one product).
//   type 'gcp' reads Google Cloud's incidents.json, filtered by `match`.
// probes  : plain HTTP checks from our side. `core: true` probes can change the
//   verdict; the rest are shown for information. A reply of 401 or 403 counts as
//   reachable: it proves the service answered, which is all an unauthenticated
//   check can prove.

export const PLATFORMS = [
  {
    slug: 'chatgpt',
    name: 'ChatGPT',
    vendor: 'OpenAI',
    initials: 'C',
    color: '#10a37f',
    blurb: "OpenAI's chat assistant",
    statusPage: 'https://status.openai.com',
    feed: {
      type: 'statuspage',
      url: 'https://status.openai.com/api/v2/summary.json',
      include: [
        'Login', 'Conversations', 'ChatGPT Work', 'Codex in ChatGPT Desktop', 'Search',
        'File uploads', 'Voice mode', 'GPTs', 'Image Generation', 'Deep Research', 'Agent',
      ],
      core: ['Conversations', 'Login'],
      incidents: 'info',
    },
    probes: [
      { label: 'chatgpt.com', url: 'https://chatgpt.com/', core: true },
      { label: 'api.openai.com', url: 'https://api.openai.com/v1/models', core: false },
    ],
  },
  {
    slug: 'claude',
    name: 'Claude',
    vendor: 'Anthropic',
    initials: 'Cl',
    color: '#d97757',
    blurb: "Anthropic's AI assistant",
    statusPage: 'https://status.claude.com',
    feed: {
      type: 'statuspage',
      url: 'https://status.claude.com/api/v2/summary.json',
      // The developer console and the government product are left out: a console
      // problem should not turn the whole service amber for people using claude.ai.
      include: ['claude.ai', 'Claude API (api.anthropic.com)', 'Claude Code', 'Claude Cowork'],
      core: ['claude.ai'],
    },
    probes: [
      { label: 'claude.ai', url: 'https://claude.ai/', core: true },
      { label: 'api.anthropic.com', url: 'https://api.anthropic.com/v1/models', core: false },
    ],
  },
  {
    slug: 'gemini',
    name: 'Gemini',
    vendor: 'Google',
    initials: 'G',
    color: '#4285f4',
    blurb: "Google's AI assistant",
    statusPage: 'https://status.cloud.google.com',
    feedNote:
      "Google publishes no status feed for the Gemini app itself. This page reflects Google Cloud incidents affecting Gemini and Vertex AI, plus our own checks.",
    feed: {
      type: 'gcp',
      url: 'https://status.cloud.google.com/incidents.json',
      match: /gemini|vertex ai/i,
    },
    probes: [
      { label: 'gemini.google.com', url: 'https://gemini.google.com/', core: true },
      {
        label: 'generativelanguage.googleapis.com',
        url: 'https://generativelanguage.googleapis.com/v1beta/models',
        core: false,
      },
    ],
  },
  {
    slug: 'perplexity',
    name: 'Perplexity',
    vendor: 'Perplexity AI',
    initials: 'P',
    color: '#20808d',
    blurb: 'The AI answer engine',
    statusPage: 'https://status.perplexity.com',
    feed: {
      type: 'statuspage',
      url: 'https://status.perplexity.com/api/v2/summary.json',
      core: ['Website', 'App'],
    },
    probes: [
      { label: 'perplexity.ai', url: 'https://www.perplexity.ai/', core: true },
      { label: 'api.perplexity.ai', url: 'https://api.perplexity.ai/chat/completions', core: false },
    ],
  },
  {
    slug: 'copilot',
    name: 'Microsoft Copilot',
    vendor: 'Microsoft',
    initials: 'Co',
    color: '#0f6cbd',
    blurb: "Microsoft's AI companion",
    statusPage: 'https://status.cloud.microsoft',
    feedNote:
      'Microsoft publishes no status feed we can read for the consumer Copilot app, so this page relies on our own checks.',
    feed: null,
    probes: [{ label: 'copilot.microsoft.com', url: 'https://copilot.microsoft.com/', core: true }],
  },
  {
    slug: 'grok',
    name: 'Grok',
    vendor: 'xAI',
    initials: 'Gr',
    color: '#6b7280',
    blurb: "xAI's chat assistant",
    statusPage: 'https://status.x.ai',
    feedNote:
      "xAI's status page cannot be read by a script, so this page relies on our own checks.",
    feed: null,
    probes: [
      { label: 'grok.com', url: 'https://grok.com/', core: true },
      { label: 'api.x.ai', url: 'https://api.x.ai/v1/models', core: true },
    ],
  },
  {
    slug: 'deepseek',
    name: 'DeepSeek',
    vendor: 'DeepSeek',
    initials: 'D',
    color: '#4d6bfe',
    blurb: 'The DeepSeek chat assistant',
    statusPage: 'https://status.deepseek.com',
    feedNote:
      "DeepSeek publishes no status feed we can read, so this page relies on our own checks.",
    feed: null,
    probes: [
      { label: 'chat.deepseek.com', url: 'https://chat.deepseek.com/', core: true },
      { label: 'api.deepseek.com', url: 'https://api.deepseek.com/models', core: true },
    ],
  },
  {
    slug: 'mistral',
    name: 'Mistral Le Chat',
    vendor: 'Mistral AI',
    initials: 'M',
    color: '#fa520f',
    blurb: "Mistral AI's chat assistant",
    statusPage: 'https://status.mistral.ai',
    feed: {
      type: 'statuspage',
      url: 'https://status.mistral.ai/api/v2/summary.json',
    },
    probes: [
      { label: 'chat.mistral.ai', url: 'https://chat.mistral.ai/', core: true },
      { label: 'api.mistral.ai', url: 'https://api.mistral.ai/v1/models', core: false },
    ],
  },
  {
    slug: 'github-copilot',
    name: 'GitHub Copilot',
    vendor: 'GitHub',
    initials: 'GH',
    color: '#8250df',
    blurb: "GitHub's AI coding assistant",
    statusPage: 'https://www.githubstatus.com',
    feed: {
      type: 'statuspage',
      url: 'https://www.githubstatus.com/api/v2/summary.json',
      include: ['Copilot'],
      core: ['Copilot'],
      incidents: 'info',
    },
    probes: [],
  },
  {
    slug: 'cursor',
    name: 'Cursor',
    vendor: 'Anysphere',
    initials: 'Cu',
    color: '#111827',
    blurb: 'The AI code editor',
    statusPage: 'https://status.cursor.com',
    feed: {
      type: 'statuspage',
      url: 'https://status.cursor.com/api/v2/summary.json',
      core: ['cursor.com', 'IDE'],
    },
    probes: [{ label: 'cursor.com', url: 'https://cursor.com/', core: true }],
  },
];

export const BY_SLUG = Object.fromEntries(PLATFORMS.map((p) => [p.slug, p]));
export const pagePath = (slug) => `/is-${slug}-down`;
