/**
 * Pure post-check of cart_result.json against orders_payload.json.
 * Money is compared in integer cents; the limit is inclusive.
 *
 * cart_result.json shape (written by the treehouse-cart skill):
 * {
 *   "session_date": "2026-10-21",
 *   "cart_url": "...", "pickup_time_set": false,
 *   "cart_handoff": { "local_storage_key": "toast-embedded-oo-cart|<restaurant guid>", "cart_guid": "<cart guid>" },
 *   "orders": [{
 *     "order_id": 1,
 *     "status": "in_cart" | "skipped",
 *     "interpretation": "...",
 *     "lines": [{ "item": "...", "modifiers": ["..."], "special_instructions": "SA", "price_usd": 11.25 }],
 *     "phase_a_subtotal_usd": 11.25,
 *     "budget_status": "PASS" | "FAIL" | "NEEDS-CHOICE" | "TRIMMED",
 *     "diet_status": "PASS" | "FAIL" | "UNSURE" | "NONE",
 *     "diet_question": "...",            // required when diet_status is UNSURE
 *     "flags": ["..."],
 *     "skip_reason": "..."               // required when status is skipped
 *   }]
 * }
 *
 * The console snippet pasted into your own browser is built HERE from the validated
 * key and GUID, never taken from the agent's output: the agent reads web content, so
 * anything it writes could carry injected code.
 */

const BUDGET = new Set(['PASS', 'FAIL', 'NEEDS-CHOICE', 'TRIMMED']);
const DIET = new Set(['PASS', 'FAIL', 'UNSURE', 'NONE']);

const GUID_RE = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const GUID = new RegExp(`^${GUID_RE}$`, 'i');
// Toast's guest-cart localStorage key: a fixed prefix plus the restaurant's GUID.
const CART_KEY = new RegExp(`^toast-embedded-oo-cart\\|${GUID_RE}$`, 'i');

function buildSnippet(key, guid) {
  return `localStorage.setItem(${JSON.stringify(key)}, ${JSON.stringify(guid)}); location.reload();`;
}

const cents = usd => Math.round(Number(usd) * 100);
const fmt = c => `$${(c / 100).toFixed(2)}`;

function verify(payload, result) {
  const errors = [];
  const warnings = [];
  const limit = cents(payload.cost_limit_usd);
  const payloadById = new Map(payload.orders.map(o => [o.order_id, o]));
  const seen = new Map();

  if (result.session_date && result.session_date !== payload.session_date) {
    errors.push(`cart_result is for ${result.session_date}, payload is for ${payload.session_date}`);
  }

  for (const r of result.orders || []) {
    const id = r.order_id;
    if (!payloadById.has(id)) { errors.push(`order ${id}: not in payload`); continue; }
    if (seen.has(id)) { errors.push(`order ${id}: listed more than once`); continue; }
    seen.set(id, r);

    if (!BUDGET.has(r.budget_status)) errors.push(`order ${id}: unknown budget_status ${JSON.stringify(r.budget_status)}`);
    if (!DIET.has(r.diet_status)) errors.push(`order ${id}: unknown diet_status ${JSON.stringify(r.diet_status)}`);
    if (r.diet_status === 'UNSURE' && !(r.diet_question || '').trim()) {
      errors.push(`order ${id}: diet UNSURE but no diet_question recorded`);
    }

    if (r.status === 'skipped') {
      if (!(r.skip_reason || '').trim()) errors.push(`order ${id}: skipped without a skip_reason`);
      if ((r.lines || []).length) errors.push(`order ${id}: skipped but has cart lines`);
      continue;
    }
    if (r.status !== 'in_cart') { errors.push(`order ${id}: unknown status ${JSON.stringify(r.status)}`); continue; }

    const lines = r.lines || [];
    if (!lines.length) { errors.push(`order ${id}: in_cart but has no lines`); continue; }
    const bad = lines.filter(l => !Number.isFinite(Number(l.price_usd)) || l.price_usd === null || l.price_usd === '');
    if (bad.length) { errors.push(`order ${id}: ${bad.length} line(s) missing a price read from the cart`); continue; }

    const total = lines.reduce((s, l) => s + cents(l.price_usd), 0);
    r._total_cents = total;
    if (total > limit) errors.push(`order ${id}: cart total ${fmt(total)} exceeds limit ${fmt(limit)}`);
    if (r.diet_status === 'FAIL') errors.push(`order ${id}: diet FAIL but in cart`);
    if (r.budget_status === 'FAIL' || r.budget_status === 'NEEDS-CHOICE') {
      warnings.push(`order ${id}: in cart with budget_status ${r.budget_status}; check this was approved`);
    }

    const label = payloadById.get(id).label;
    lines.forEach((l, i) => {
      if (!String(l.special_instructions || '').startsWith(label)) {
        warnings.push(`order ${id} line ${i + 1}: special instructions don't start with label "${label}"`);
      }
    });

    if (r.phase_a_subtotal_usd !== undefined && r.phase_a_subtotal_usd !== null) {
      const planned = cents(r.phase_a_subtotal_usd);
      if (planned !== total) warnings.push(`order ${id}: cart total ${fmt(total)} differs from Phase A subtotal ${fmt(planned)}`);
    }
  }

  for (const id of payloadById.keys()) {
    if (!seen.has(id)) errors.push(`order ${id}: missing from cart_result (must be in cart or skipped with a reason)`);
  }

  let snippet = null;
  const handoff = result.cart_handoff || {};
  if (!CART_KEY.test(handoff.local_storage_key || '')) {
    errors.push(`cart_handoff.local_storage_key is ${JSON.stringify(handoff.local_storage_key)}, expected "toast-embedded-oo-cart|<GUID>"`);
  } else if (!GUID.test(handoff.cart_guid || '')) {
    errors.push(`cart_handoff.cart_guid is not a GUID: ${JSON.stringify(handoff.cart_guid)}`);
  } else {
    snippet = buildSnippet(handoff.local_storage_key, handoff.cart_guid);
  }

  const results = [...seen.values()];
  const inCart = results.filter(r => r.status === 'in_cart');
  const skipped = results.filter(r => r.status === 'skipped');
  const unsure = results.filter(r => r.diet_status === 'UNSURE');
  const grandTotal = inCart.reduce((s, r) => s + (r._total_cents || 0), 0);

  return { ok: errors.length === 0, errors, warnings, inCart, skipped, unsure, grandTotalCents: grandTotal, snippet };
}

function formatSummary(payload, result, report) {
  const labelOf = id => (payload.orders.find(o => o.order_id === id) || {}).label || '?';
  const out = [];
  out.push(`TreeHouse order for ${payload.session_date} — pickup ${payload.pickup_time} (${payload.timezone || 'local'})` +
    (result.pickup_time_set ? ' [already set in cart]' : ' [SELECT THIS AT CHECKOUT]'));
  out.push('');
  out.push(`IN CART (${report.inCart.length}):`);
  for (const r of report.inCart) {
    const items = r.lines.map(l => l.item + (l.modifiers && l.modifiers.length ? ` (${l.modifiers.join(', ')})` : '')).join(' + ');
    const flags = (r.flags || []).length ? `  ⚑ ${r.flags.join('; ')}` : '';
    out.push(`  #${r.order_id} ${labelOf(r.order_id).padEnd(5)} ${fmt(r._total_cents || 0).padStart(7)}  ${items}${flags}`);
  }
  out.push(`  Subtotal: ${fmt(report.grandTotalCents)} (pre-tax, pre-tip)`);
  out.push('');
  out.push(`SKIPPED (${report.skipped.length}):`);
  const rawOf = id => (payload.orders.find(o => o.order_id === id) || {}).raw_order || '';
  for (const r of report.skipped) {
    out.push(`  #${r.order_id} ${labelOf(r.order_id).padEnd(5)} ${r.skip_reason}`);
    out.push(`        asked for: ${JSON.stringify(rawOf(r.order_id))}`);
  }
  if (report.unsure.length) {
    out.push('');
    out.push(`DIET UNSURE (${report.unsure.length}) — answer in data/diet_notes.yaml:`);
    for (const r of report.unsure) out.push(`  #${r.order_id} ${r.diet_question}`);
  }
  if (report.warnings.length) {
    out.push('');
    out.push('WARNINGS:');
    report.warnings.forEach(w => out.push(`  - ${w}`));
  }
  out.push('');
  if (report.ok) {
    out.push('CHECKS PASSED');
  } else {
    out.push('CHECKS FAILED:');
    report.errors.forEach(e => out.push(`  ✗ ${e}`));
  }
  if (report.snippet) {
    out.push('');
    out.push(`To load the cart: open ${payload.site_url} in your browser, open the JS console, paste:`);
    out.push(`  ${report.snippet}`);
  }
  return out.join('\n');
}

module.exports = { verify, formatSummary, buildSnippet, cents };
