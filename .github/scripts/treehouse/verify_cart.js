/**
 * Deterministic post-check of the browser agent's cart against the payload.
 *
 * Usage:
 *   node .github/scripts/treehouse/verify_cart.js runs/<date>/upload/orders_payload.json runs/<date>/cart_result.json [--copy]
 *
 * Exits 1 if any check fails. Prints a one-screen summary either way, ending with the
 * console snippet that loads the cart in your own browser. --copy puts that snippet on
 * the macOS clipboard (only when all checks pass).
 */
const fs = require('fs');
const { execFileSync } = require('child_process');
const { verify, formatSummary } = require('./verify');

function main() {
  const argv = process.argv.slice(2);
  const copy = argv.includes('--copy');
  const [payloadPath, resultPath] = argv.filter(a => a !== '--copy');
  if (!payloadPath || !resultPath) {
    console.error('usage: verify_cart.js <orders_payload.json> <cart_result.json> [--copy]');
    process.exit(2);
  }
  const payload = JSON.parse(fs.readFileSync(payloadPath, 'utf8'));
  const result = JSON.parse(fs.readFileSync(resultPath, 'utf8'));
  const report = verify(payload, result);
  console.log(formatSummary(payload, result, report));
  if (copy && report.ok && report.snippet) {
    execFileSync('pbcopy', { input: report.snippet });
    console.log('(snippet copied to clipboard)');
  }
  process.exit(report.ok ? 0 : 1);
}

if (require.main === module) main();
