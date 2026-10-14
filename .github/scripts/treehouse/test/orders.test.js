const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { loadConfig } = require('../config');
const { findTargetSession, todayInZone, initials, buildOrders, buildPayload, parseTimestamp } = require('../orders');

const config = loadConfig();
const rows = require('./fixtures/sheet_rows.json');

const presentations = [
  { date: '2026-10-07', title: 'past' },
  { date: '2026-10-28', title: 'two weeks out' },
  { date: '2026-10-21', title: 'next week' },
];

test('picks the earliest session inside the window, inclusive of both ends', () => {
  assert.equal(findTargetSession(presentations, '2026-10-14', 7).title, 'next week');
  assert.equal(findTargetSession(presentations, '2026-10-21', 7).title, 'next week');
  assert.equal(findTargetSession(presentations, '2026-10-22', 7).title, 'two weeks out');
  assert.equal(findTargetSession(presentations, '2026-10-14', 6), null);
});

test('today is computed in Pacific time, not UTC', () => {
  // 2026-10-15 03:00 UTC is still 10/14 evening in California.
  assert.equal(todayInZone('America/Los_Angeles', new Date('2026-10-15T03:00:00Z')), '2026-10-14');
});

test('parses Google Forms timestamps', () => {
  assert.ok(parseTimestamp('10/14/2026 10:30:00') > parseTimestamp('10/14/2026 9:05:00'));
  assert.equal(parseTimestamp('garbage'), null);
});

test('initials', () => {
  assert.equal(initials('Mary Ann', 'Evans'), 'ME');
  assert.equal(initials('ada', 'de la Lovelace'), 'AL');
  assert.equal(initials('', ''), '??');
});

test('filters to the session, dedupes to the latest submission, keeps stable IDs', () => {
  const { orders, stats } = buildOrders(rows, '2026-10-21', config);

  assert.deepEqual(orders.map(o => o.order_id), [1, 2, 3, 4]);
  // Ada resubmitted: her latest order and diet win, but she keeps ID 1 (first submission).
  assert.deepEqual(orders[0], { order_id: 1, label: 'AL-1', raw_order: 'Synthetic order A2: cheese pizza slice', raw_diet: 'no mushrooms' });
  assert.deepEqual(orders[1], { order_id: 2, label: 'AT', raw_order: 'Synthetic order B: tofu bowl', raw_diet: 'vegetarian' });
  // Same initials as Ada -> disambiguated.
  assert.equal(orders[2].label, 'AL-2');
  // Raw text passes through untouched.
  assert.equal(orders[2].raw_order, 'synthetic garden salad, add tofu. Thanks!!');
  // Said yes to lunch but left the order blank: kept so the agent flags it.
  assert.deepEqual(orders[3], { order_id: 4, label: 'DK', raw_order: '', raw_diet: '' });

  assert.equal(stats.rows_for_session, 8);
  assert.equal(stats.duplicate_submissions_dropped, 1);
  assert.equal(stats.skipped_not_attending, 1);
  assert.equal(stats.skipped_no_lunch, 1);
  assert.equal(stats.skipped_no_order_text, 1);
});

test('payload never contains names or emails', () => {
  const { orders } = buildOrders(rows, '2026-10-21', config);
  const payload = JSON.stringify(buildPayload({ sessionDate: '2026-10-21', config, orders }));
  for (const secret of ['Lovelace', 'Turing', 'example.edu', 'Ada', 'Knuth']) {
    assert.ok(!payload.includes(secret), `payload leaked ${secret}`);
  }
});

test('order and diet stay in the same record', () => {
  const { orders } = buildOrders(rows, '2026-10-21', config);
  for (const o of orders) assert.deepEqual(Object.keys(o), ['order_id', 'label', 'raw_order', 'raw_diet']);
});

test('missing required column fails loudly', () => {
  const broken = [rows[0].map(h => (h.startsWith('In the event') ? 'Lunch?' : h)), ...rows.slice(1)];
  assert.throws(() => buildOrders(broken, '2026-10-21', config), /missing required column/);
});

test('config overrides', () => {
  const c = loadConfig(undefined, { pickupTime: '12:15', costLimitUsd: '15' });
  assert.equal(c.pickup_time, '12:15');
  assert.equal(c.cost_limit_usd, 15);
  assert.throws(() => loadConfig(undefined, { pickupTime: 'noon' }), /HH:MM/);
});
