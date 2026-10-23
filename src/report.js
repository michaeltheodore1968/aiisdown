// The cross-service reliability comparison: built live for the rolling 30 days
// and snapshotted into D1 just after each month ends.
import { PLATFORMS, BY_SLUG, pagePath } from './platforms.js';
import { esc, duration, dayLabel, joinNames } from './util.js';
import { daySeries, uptime } from './state.js';
import { layout } from './render.js';

const DAY_MS = 86400000;
const MATCH_MS = 10 * 60 * 1000; // how close in time a status change and a provider incident must be to count as the same event
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// Incident and status-change totals for the last 30 days, per service, computed in SQL.
export async function loadAllStats(env, now) {
  const since = now - 30 * DAY_MS;
  const [inc, ev] = await Promise.all([
    env.DB.prepare(
      `SELECT slug, COUNT(*) AS n,
              SUM(resolved_at IS NULL) AS open,
              SUM(resolved_at IS NOT NULL) AS resolved,
              COALESCE(SUM(resolved_at - started_at), 0) AS total_ms,
              COALESCE(MAX(resolved_at - started_at), 0) AS longest_ms
         FROM incidents WHERE started_at >= ?1 GROUP BY slug`,
    )
      .bind(since)
      .all(),
    env.DB.prepare(
      `SELECT slug, COUNT(*) AS n,
              SUM(EXISTS (SELECT 1 FROM incidents i WHERE i.slug = e.slug AND i.started_at <= e.at + ?2
                          AND COALESCE(i.resolved_at, 9007199254740991) >= e.at - ?2)) AS matched
         FROM events e WHERE e.at >= ?1 AND e.from_status = 'operational' GROUP BY e.slug`,
    )
      .bind(since, MATCH_MS)
      .all(),
  ]);
  const out = {};
  for (const p of PLATFORMS) {
    const i = inc.results.find((r) => r.slug === p.slug);
    const e = ev.results.find((r) => r.slug === p.slug);
    out[p.slug] = {
      incidents: { n: i?.n || 0, open: i?.open || 0, resolved: i?.resolved || 0, totalMs: i?.total_ms || 0, longestMs: i?.longest_ms || 0 },
      changes: { n: e?.n || 0, matched: e?.matched || 0 },
    };
  }
  return out;
}

// What we keep for each service: small and self-contained, so a stored month never depends on tables that get pruned.
export function buildReport(states, stats, now) {
  const rows = PLATFORMS.map((p) => {
    const days = states[p.slug]?.data?.days;
    const covered = daySeries(days, now).filter((d) => d.total >= 3);
    const worst = covered.length >= 3 ? covered.reduce((a, b) => (b.ok / b.total < a.ok / a.total ? b : a)) : null;
    return {
      slug: p.slug,
      uptime: uptime(days),
      daysCovered: covered.length,
      worst: worst ? { day: worst.day, pct: Math.round((worst.ok / worst.total) * 1000) / 10 } : null,
      incidents: p.feed ? stats[p.slug].incidents : null,
      changes: stats[p.slug].changes,
    };
  });
  return { generatedAt: now, rows };
}

export const monthKey = (ms) => new Date(ms).toISOString().slice(0, 7);
export const monthLabel = (key) => `${MONTHS[Number(key.slice(5, 7)) - 1]} ${key.slice(0, 4)}`;
export const previousMonthKey = (ms) => {
  const d = new Date(ms);
  return monthKey(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 0));
};

// Written once, just after midnight UTC on the 1st, for the month that has just ended.
// The tallies hold 30 days, so a 31-day month's first day is not in the snapshot; the page says so.
export async function snapshotMonth(env, now) {
  const key = previousMonthKey(now);
  const { results } = await env.DB.prepare('SELECT slug, data FROM platform_state').all();
  const states = {};
  for (const r of results) {
    try {
      states[r.slug] = { data: JSON.parse(r.data) };
    } catch {
      /* skip */
    }
  }
  const report = buildReport(states, await loadAllStats(env, now), now);
  if (!report.rows.some((r) => r.uptime !== null)) return false;
  await env.DB.prepare('INSERT OR IGNORE INTO monthly_reports (month, created_at, data) VALUES (?1, ?2, ?3)').bind(key, now, JSON.stringify(report)).run();
  return true;
}

// The prose is generated from the rows, and each sentence is left out when its data is missing.
export function reportSummary(report) {
  const ranked = report.rows.filter((r) => r.uptime !== null).sort((a, b) => b.uptime - a.uptime || a.slug.localeCompare(b.slug));
  const name = (r) => BY_SLUG[r.slug].name;
  const out = [];
  if (ranked.length >= 2) {
    const top = ranked[0];
    const low = ranked[ranked.length - 1];
    out.push(
      top.uptime === low.uptime
        ? `All ${ranked.length} services with enough data had the same share of fully operational checks, ${top.uptime}%.`
        : `Of the ${ranked.length} services with enough data, ${name(top)} had the highest share of fully operational checks at ${top.uptime}% and ${name(low)} the lowest at ${low.uptime}%.`,
    );
  } else if (ranked.length === 1) {
    out.push(`Only ${name(ranked[0])} has enough data for a comparison so far.`);
  } else {
    return ['We do not yet hold enough checks to compare the services.'];
  }
  const withFeed = report.rows.filter((r) => r.incidents);
  const busiest = withFeed.filter((r) => r.incidents.n > 0).sort((a, b) => b.incidents.n - a.incidents.n || a.slug.localeCompare(b.slug));
  if (withFeed.length) {
    if (!busiest.length) out.push('None of the status pages we read reported an incident in this period.');
    else {
      const top = busiest[0];
      const tied = busiest.filter((r) => r.incidents.n === top.incidents.n);
      out.push(
        `${joinNames(tied.map(name))} ${tied.length === 1 ? 'had' : 'each had'} the most incidents on ${tied.length === 1 ? 'its' : 'their'} provider's status page, ${top.incidents.n}${top.incidents.n === 1 ? '' : ' in each case'}. Page-wide incidents on shared status pages are counted, so a count can include faults that did not touch the service itself.`,
      );
    }
  }
  const alone = report.rows.filter((r) => r.incidents && r.changes.n > r.changes.matched);
  const totalAlone = alone.reduce((s, r) => s + (r.changes.n - r.changes.matched), 0);
  const totalChanges = withFeed.reduce((s, r) => s + r.changes.n, 0);
  if (totalChanges) {
    out.push(
      totalAlone
        ? `Across the services with a readable status page, our checks saw ${totalAlone} ${totalAlone === 1 ? 'status change' : 'status changes'} that no provider incident coincided with.`
        : 'Every status change we saw on a service with a readable status page coincided with an incident the provider reported.',
    );
  }
  return out;
}

const cell = (v) => `<td>${v}</td>`;

function table(report) {
  const rows = [...report.rows].sort((a, b) => (b.uptime ?? -1) - (a.uptime ?? -1) || a.slug.localeCompare(b.slug));
  const body = rows
    .map((r) => {
      const p = BY_SLUG[r.slug];
      const inc = r.incidents
        ? r.incidents.n
          ? `${r.incidents.n}${r.incidents.resolved ? `, ${esc(duration(r.incidents.totalMs))} in total` : ''}`
          : 'None'
        : 'No readable feed';
      return `<tr><th scope="row"><a href="${pagePath(r.slug)}">${esc(p.name)}</a></th>${cell(r.uptime === null ? 'Building history' : `${r.uptime}%`)}${cell(r.worst ? `${esc(dayLabel(r.worst.day))} (${r.worst.pct}%)` : 'Not enough data')}${cell(inc)}${cell(r.changes.n)}</tr>`;
    })
    .join('');
  return `<div class="table-wrap"><table class="compare"><caption class="muted">Services ranked by the share of our checks that found them fully operational.</caption><thead><tr><th scope="col">Service</th><th scope="col">Fully operational</th><th scope="col">Weakest day</th><th scope="col">Provider incidents</th><th scope="col">Status changes we saw</th></tr></thead><tbody>${body}</tbody></table></div>`;
}

const METHOD = `<h2>How to read this</h2>
<p>The percentage is the share of our five-minute checks that found the service fully operational, so it measures what our checks and the provider's status page showed, not what any one customer experienced. It is not a service-level figure from the provider. Differences of a few tenths of a percent are small enough to be noise. A service shows "Building history" until we hold at least three days of checks. Incidents that opened and closed between two of our checks may be missing. Services with no readable status page are compared on our own checks only, and the full method is in <a href="/guides/how-we-check">how we check</a>.</p>`;

export function reportPage(env, report, { month, archive }) {
  const live = !month;
  const heading = live ? 'How reliable are the AI services? The last 30 days' : `AI service reliability in ${monthLabel(month)}`;
  const when = new Date(report.generatedAt);
  const stamp = `${when.getUTCDate()} ${MONTHS[when.getUTCMonth()]} ${when.getUTCFullYear()}`;
  const intro = live
    ? `This compares the services we watch over the 30 days to ${stamp}. It updates as new checks come in, and a snapshot is saved at the start of each month.`
    : `A snapshot taken on ${stamp}, covering the 30 days that ended then. In a 31-day month that leaves out the first day. Nothing on this page changes after it is saved.`;
  const lines = reportSummary(report);
  const archiveList = archive.length
    ? `<h2>Earlier months</h2><ul class="plain">${archive.map((k) => `<li><a href="/reliability/${k}">${esc(monthLabel(k))}</a></li>`).join('')}</ul>`
    : live
      ? '<p class="muted">The first monthly snapshot will appear here at the start of next month.</p>'
      : '';
  const path = live ? '/reliability' : `/reliability/${month}`;
  const body = `
<nav class="crumbs" aria-label="Breadcrumb"><a href="/">All AI services</a> / ${live ? 'Reliability' : `<a href="/reliability">Reliability</a> / ${esc(monthLabel(month))}`}</nav>
<article class="prose article">
<h1>${esc(heading)}</h1>
<p>${esc(intro)}</p>
<p>${lines.map(esc).join(' ')}</p>
${table(report)}
${METHOD}
${archiveList}
${live ? '' : '<p><a href="/reliability">See the latest 30 days</a></p>'}
</article>`;
  return layout(env, {
    title: live ? 'AI service reliability: the last 30 days | Is AI Down?' : `AI service reliability in ${monthLabel(month)} | Is AI Down?`,
    description: live
      ? 'How ChatGPT, Claude, Gemini and other AI services compare over the last 30 days, from our own five-minute checks and each provider status page.'
      : `How the major AI services compared in ${monthLabel(month)}, from our own five-minute checks and each provider status page.`,
    path,
    body,
  });
}
