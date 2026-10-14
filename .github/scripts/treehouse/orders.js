/**
 * Pure logic for turning RSVP sheet rows into orders_payload.json.
 * No network access here, so everything is unit-testable with fixtures.
 *
 * The order text is passed through verbatim on purpose: the browser agent
 * interprets it, and cleaning it here would hide the cases it has to handle.
 */

const { normalizeDate } = require('../utils');


/** Today's date (YYYY-MM-DD) in the given IANA time zone. */
function todayInZone(timeZone, now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

function addDays(isoDate, days) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Pick the earliest session in presentations.json within
 * [today, today + windowDays]. Returns the presentation or null.
 */
function findTargetSession(presentations, today, windowDays) {
  const end = addDays(today, windowDays);
  const candidates = presentations
    .filter(p => typeof p.date === 'string' && p.date >= today && p.date <= end)
    .sort((a, b) => a.date.localeCompare(b.date));
  return candidates[0] || null;
}

/**
 * Parse a Google Forms timestamp ("10/14/2026 12:34:56") to a sortable number.
 * Returns null if it can't be parsed; callers fall back to row order.
 */
function parseTimestamp(value) {
  if (!value) return null;
  const m = String(value).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return null;
  const [, mo, d, y, h, mi, s] = m.map(Number);
  return Date.UTC(y, mo - 1, d, h, mi, s || 0);
}

const isNo = v => /^\s*no\b/i.test(v || '');
const isYes = v => /^\s*yes\b/i.test(v || '');

/** "Mary Ann" + "Evans" -> "ME". Empty names -> "??". */
function initials(firstName, surname) {
  const first = (firstName || '').trim().charAt(0);
  const last = (surname || '').trim().split(/\s+/).pop().charAt(0);
  const out = `${first}${last}`.toUpperCase();
  return out || '??';
}

/** Map header names from config to column indices; throw if a required one is missing. */
function columnIndex(headers, columns) {
  const trimmed = headers.map(h => String(h || '').trim());
  const idx = {};
  for (const [key, header] of Object.entries(columns)) {
    idx[key] = trimmed.indexOf(String(header).trim());
  }
  const required = ['session_date', 'order', 'diet'];
  const missing = required.filter(k => idx[k] === -1);
  if (missing.length) {
    throw new Error(`RSVP sheet is missing required column(s): ${missing.map(k => JSON.stringify(columns[k])).join(', ')}`);
  }
  if (idx.email === -1 && (idx.first_name === -1 || idx.surname === -1)) {
    throw new Error('RSVP sheet needs an email column or both name columns to dedupe submissions');
  }
  return idx;
}

/**
 * Build the orders for one session from raw sheet rows (rows[0] = headers).
 *
 * - Keeps rows whose session date matches sessionDate.
 * - Drops people who answered "No" to attending or wanting lunch, and people
 *   with no order text who didn't explicitly say they want lunch.
 * - Dedupes per person (email, else name), keeping the LATEST submission.
 * - Assigns order_id by each person's FIRST submission time, so IDs stay
 *   stable when someone edits their RSVP.
 *
 * Returns { orders, stats }. Each order keeps its diet text in the same record.
 */
function buildOrders(rows, sessionDate, config) {
  if (!rows || rows.length < 2) return { orders: [], stats: { rows_for_session: 0 } };
  const col = columnIndex(rows[0], config.sheet.columns);
  const cell = (row, key) => (col[key] === -1 || col[key] === undefined ? '' : String(row[col[key]] ?? ''));

  const byPerson = new Map();
  let rowsForSession = 0;

  rows.slice(1).forEach((row, i) => {
    if (normalizeDate(cell(row, 'session_date')) !== sessionDate) return;
    rowsForSession++;
    const email = cell(row, 'email').trim().toLowerCase();
    const first = cell(row, 'first_name').trim();
    const last = cell(row, 'surname').trim();
    const key = email || `name:${first.toLowerCase()} ${last.toLowerCase()}`;
    const ts = parseTimestamp(cell(row, 'timestamp'));
    const submission = { row, rowIndex: i, ts: ts ?? i, first, last };

    const prev = byPerson.get(key);
    if (!prev) {
      byPerson.set(key, { firstSeen: submission.ts, firstRow: i, latest: submission, submissions: 1 });
    } else {
      prev.submissions++;
      if (submission.ts < prev.firstSeen) { prev.firstSeen = submission.ts; prev.firstRow = i; }
      // Later timestamp wins; equal timestamps fall back to later row.
      if (submission.ts > prev.latest.ts || (submission.ts === prev.latest.ts && i > prev.latest.rowIndex)) {
        prev.latest = submission;
      }
    }
  });

  const stats = {
    rows_for_session: rowsForSession,
    people: byPerson.size,
    duplicate_submissions_dropped: rowsForSession - byPerson.size,
    skipped_not_attending: 0,
    skipped_no_lunch: 0,
    skipped_no_order_text: 0,
  };

  const people = [...byPerson.values()].sort((a, b) => a.firstSeen - b.firstSeen || a.firstRow - b.firstRow);
  const kept = [];
  for (const person of people) {
    const { row } = person.latest;
    if (isNo(cell(row, 'attending'))) { stats.skipped_not_attending++; continue; }
    const lunch = cell(row, 'wants_lunch');
    if (isNo(lunch)) { stats.skipped_no_lunch++; continue; }
    const rawOrder = cell(row, 'order');
    if (!rawOrder.trim() && !isYes(lunch)) { stats.skipped_no_order_text++; continue; }
    kept.push(person);
  }

  const baseLabels = kept.map(p => initials(p.latest.first, p.latest.last));
  const totals = new Map();
  baseLabels.forEach(b => totals.set(b, (totals.get(b) || 0) + 1));
  const seen = new Map();

  const orders = kept.map((person, n) => {
    const { row } = person.latest;
    const base = baseLabels[n];
    const k = (seen.get(base) || 0) + 1;
    seen.set(base, k);
    return {
      order_id: n + 1,
      label: totals.get(base) > 1 ? `${base}-${k}` : base,
      raw_order: cell(row, 'order'),
      raw_diet: cell(row, 'diet'),
    };
  });

  stats.orders = orders.length;
  return { orders, stats };
}

function buildPayload({ sessionDate, sessionTitle, config, orders }) {
  return {
    session_date: sessionDate,
    session_title: sessionTitle || '',
    pickup_time: config.pickup_time,
    timezone: config.timezone,
    cost_limit_usd: config.cost_limit_usd,
    cost_limit_inclusive: true,
    site_url: config.site_url,
    menu_exclusions: config.menu_exclusions,
    orders,
  };
}

module.exports = {
  normalizeDate,
  todayInZone,
  addDays,
  findTargetSession,
  parseTimestamp,
  initials,
  columnIndex,
  buildOrders,
  buildPayload,
};
