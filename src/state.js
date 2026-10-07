import { SEVERITY } from './verdict.js';
import { dayKey } from './util.js';

export const SLOT_MS = 15 * 60 * 1000;
export const SLOTS = 96; // 24 hours of 15 minute slots
export const DAYS = 30;

// Rolling tallies kept inside each platform's row, so drawing a page never
// needs to scan history. `slots` holds the worst severity seen in each
// 15 minute slot; `days` holds [operational checks, total checks] per UTC day.
export function updateTallies(prev, status, now) {
  const slots = { ...(prev?.slots || {}) };
  const days = { ...(prev?.days || {}) };

  if (status !== 'unknown') {
    const idx = Math.floor(now / SLOT_MS);
    slots[idx] = Math.max(slots[idx] ?? 0, SEVERITY[status]);
    const k = dayKey(now);
    const [ok, total] = days[k] || [0, 0];
    days[k] = [ok + (status === 'operational' ? 1 : 0), total + 1];
  }

  const minIdx = Math.floor(now / SLOT_MS) - SLOTS + 1;
  for (const k of Object.keys(slots)) if (Number(k) < minIdx) delete slots[k];
  const keep = Object.keys(days).sort().slice(-DAYS);
  for (const k of Object.keys(days)) if (!keep.includes(k)) delete days[k];
  return { slots, days };
}

// Ordered array for drawing: oldest first, null where we have no data.
export function slotSeries(slots, now) {
  const last = Math.floor(now / SLOT_MS);
  return Array.from({ length: SLOTS }, (_, i) => slots?.[last - SLOTS + 1 + i] ?? null);
}

export function daySeries(days, now) {
  const out = [];
  for (let i = DAYS - 1; i >= 0; i--) {
    const k = dayKey(now - i * 86400000);
    const [ok, total] = days?.[k] || [0, 0];
    out.push({ day: k, ok, total });
  }
  return out;
}

// Share of checks over the last 30 days that found the service fully
// operational. Hidden until there are at least three days of data (864 checks),
// because a percentage from a few hours is misleading.
export function uptime(days) {
  let ok = 0;
  let total = 0;
  for (const [o, t] of Object.values(days || {})) {
    ok += o;
    total += t;
  }
  if (total < 864) return null;
  return Math.round((ok / total) * 1000) / 10;
}
