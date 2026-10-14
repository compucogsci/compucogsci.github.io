/**
 * Read the RSVP sheet and write the Cowork upload folder for the next session:
 *   runs/<date>/upload/orders_payload.json   (the orders)
 *   runs/<date>/upload/menu_snapshot.json    (copied from data/, a speed hint for the agent)
 *   runs/<date>/upload/diet_notes.yaml       (copied from data/, confirmed ingredient facts)
 *
 * Usually run through treehouse_prep.sh, which loads the credentials from the Keychain.
 *
 * Usage:
 *   node .github/scripts/treehouse/prepare_orders.js [--session-date YYYY-MM-DD]
 *        [--pickup-time HH:MM] [--cost-limit 14.50] [--out-dir runs/<date>]
 *        [--sheet-json fixture.json]   # read rows from a local file instead of Google Sheets
 *
 * Env: GOOGLE_SHEETS_CREDENTIALS (service-account JSON), SHEET_ID.
 *
 * The payload carries order IDs, initials labels, raw order text and raw diet text only.
 * Names and emails never leave this script. runs/ is gitignored.
 */
const fs = require('fs');
const path = require('path');
const { REPO_ROOT, loadConfig } = require('./config');
const { todayInZone, findTargetSession, buildOrders, buildPayload } = require('./orders');

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (!flag.startsWith('--')) throw new Error(`Unexpected argument: ${flag}`);
    const key = flag.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    args[key] = argv[++i];
  }
  return args;
}

async function fetchRows(config) {
  const utils = require('../utils');
  const credentials = JSON.parse(process.env.GOOGLE_SHEETS_CREDENTIALS || '');
  const sheets = utils.getGoogleSheetsClient(credentials);
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.SHEET_ID,
    range: config.sheet.range,
  });
  return response.data.values || [];
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const config = loadConfig(undefined, {
    pickupTime: args.pickupTime,
    costLimitUsd: args.costLimit,
  });

  const presentations = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'presentations.json'), 'utf8'));
  let sessionDate = args.sessionDate;
  let sessionTitle = '';
  if (sessionDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(sessionDate)) throw new Error(`--session-date must be YYYY-MM-DD, got ${sessionDate}`);
    sessionTitle = (presentations.find(p => p.date === sessionDate) || {}).title || '';
  } else {
    const today = todayInZone(config.timezone);
    const session = findTargetSession(presentations, today, config.search_window_days);
    if (!session) {
      throw new Error(`No session in presentations.json between ${today} and +${config.search_window_days} days. Pass --session-date to override.`);
    }
    sessionDate = session.date;
    sessionTitle = session.title;
  }

  const rows = args.sheetJson
    ? JSON.parse(fs.readFileSync(args.sheetJson, 'utf8'))
    : await fetchRows(config);

  const { orders, stats } = buildOrders(rows, sessionDate, config);
  const payload = buildPayload({ sessionDate, sessionTitle, config, orders });

  const outDir = args.outDir || path.join(REPO_ROOT, 'runs', sessionDate);
  const uploadDir = path.join(outDir, 'upload');
  fs.mkdirSync(uploadDir, { recursive: true });
  const payloadPath = path.join(uploadDir, 'orders_payload.json');
  fs.writeFileSync(payloadPath, JSON.stringify(payload, null, 2) + '\n');
  for (const f of ['menu_snapshot.json', 'diet_notes.yaml']) {
    fs.copyFileSync(path.join(REPO_ROOT, 'data', f), path.join(uploadDir, f));
  }

  console.log(`Session: ${sessionDate} (${sessionTitle || 'untitled'})`);
  console.log(`Pickup: ${config.pickup_time} ${config.timezone}; limit $${config.cost_limit_usd.toFixed(2)} inclusive`);
  console.log('Counts:', JSON.stringify(stats));
  console.log(`Wrote ${orders.length} orders. Attach everything in:\n  ${path.relative(process.cwd(), uploadDir)}/`);
  if (orders.length === 0) {
    throw new Error(`No lunch orders found for ${sessionDate}. Check the session date and the sheet column headers in config/treehouse.yaml.`);
  }
}

if (require.main === module) {
  main().catch(err => {
    console.error(err.message);
    process.exit(1);
  });
}

module.exports = { parseArgs };
