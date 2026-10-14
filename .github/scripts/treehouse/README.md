# TreeHouse combined-order pipeline

Builds a Toast guest cart at Stanford TreeHouse from the next session's lunch RSVPs.
Everything runs on your Mac. Nothing runs in GitHub Actions, and no RSVP data touches GitHub.
The Claude agent never logs in, never sees payment details, and never checks out. You
load the finished cart into your own browser and pay there.

## Each session (4 steps)

```bash
.github/scripts/treehouse/treehouse.sh prep
```
1. **prep**: reads the RSVP sheet and writes `runs/<date>/upload/` (`orders_payload.json`,
   `menu_snapshot.json`, `diet_notes.yaml`).
2. **Cowork**: start a session, attach the three files in `runs/<date>/upload/`, and say
   "use the treehouse-cart skill". Review its table, approve, and let it fill the cart.
   Download `cart_result.json` and `cart_report.md` into `runs/cowork_downloads/`.
3. **check**:
   ```bash
   .github/scripts/treehouse/treehouse.sh check
   ```
   This moves them into `runs/<date>/` (using the date in `cart_result.json`) and checks every order against the limit and its
   diet. It also lists what was skipped (with the original request) and copies the cart-loading
   snippet to your clipboard.
4. **Pay**: open https://treehouse.toast.site/order/ordertreehouse in any browser, open the
   JS console, paste, and press Enter. The page reloads with the cart. Add any skipped orders
   by hand, select the pickup time, and pay.

Overrides: `treehouse.sh prep --session-date 2026-10-21 --pickup-time 12:00 --cost-limit 15`.

## Setup (once)

1. **Sheet credentials in the Keychain.** Use the same service-account key as the
   `GOOGLE_SHEETS_CREDENTIALS` repo secret, or make a new key for that service account in the
   GCP console. Store it compacted onto one line, because Keychain returns multi-line values hex-encoded:
   ```bash
   security add-generic-password -a "$USER" -s compucogsci-sheets-credentials \
     -w "$(node -e 'process.stdout.write(JSON.stringify(require(process.argv[1])))' ./key.json)"
   security add-generic-password -a "$USER" -s compucogsci-sheet-id -w '<sheet id>'
   rm ./key.json
   ```
2. **Skill.** Run `treehouse.sh skill` and upload `runs/treehouse-cart.zip` in Claude
   (Settings → Capabilities → Skills). Re-upload whenever `SKILL.md` changes. On the Stanford
   workspace, an admin may have to enable custom skills.
3. **Cowork session settings:** use Stanford's Claude for Education workspace, not a personal
   account. Turn off computer use. Connect no local folders and no connectors. Turn Memory off
   (in the "+" menu). Use manual approval for the first runs.

## Files

| path | what |
|---|---|
| `config/treehouse.yaml` | limit, pickup time, search window, sheet column headers, Toast cart key, menu exclusions |
| `.github/scripts/treehouse/treehouse.sh` | `prep` / `check` / `skill` |
| `.github/scripts/treehouse/prepare_orders.js` | sheet → payload (reuses `utils.getGoogleSheetsClient`) |
| `.github/scripts/treehouse/verify_cart.js` | post-check, plus building the cart snippet |
| `.claude/skills/treehouse-cart/SKILL.md` | the agent skill (self-contained, for Cowork) |
| `data/menu_snapshot.json` | 353-item menu capture from 2026-10-14 (speed hint only; live prices win) |
| `data/diet_notes.yaml` | human-confirmed ingredient facts. Fill in when a run reports diet UNSURE |
| `runs/` | gitignored. Payloads, cart results, reports, and real-order test sets (`runs/fixtures/`) |
| `runs/cowork_downloads/` | where you save Cowork's two output files. Only its `.gitkeep` is tracked |

Tests: `cd .github/scripts && npm test`. The fixtures are synthetic.

## Decisions

- **Sheet:** session = `You are RSVP'ing for our meeting on:`; order = the "In the event we do
  order individual meals…" column; diet = `report dietary restrictions here:`. All headers are in the config.
- **Dedupe:** per email (falling back to name). The latest submission wins. The order ID follows the
  person's first submission, so it stays stable when someone edits their RSVP.
- **Filtering:** drops "No" answers to attending or to "Do you want lunch?", and blank orders from
  people who didn't say yes to lunch. A "yes" with a blank order is kept, so the agent flags it.
- **Session:** the earliest `presentations.json` date in [today, today + 7 days], Pacific time.
- **Over the limit with several entrées:** the first entrée goes in the cart, flagged `TRIMMED`.
- **Bag labels:** initials only (`SA`; collisions become `SA-1`, `SA-2`). Names and emails never
  leave `prep`.
- **Pickup:** 11:45 by default. **Limit:** $14.50, pre-tax, pre-tip, inclusive.

## Cart handoff

Toast keeps the guest cart's ID in your browser's localStorage under
`toast-embedded-oo-cart|<restaurant GUID>`. The key appears to be fixed for TreeHouse (only the restaurant part varies between restaurants); the
value (the cart GUID) is new for each cart. The agent reports only that key and value. `check`
accepts them only if both have exactly that shape, then builds the snippet itself.
No GUIDs are committed. The cart GUID works like a password to that cart, so it stays in `runs/`. That way you never paste
code the agent wrote: the agent reads web pages, so its output could carry injected code.

This worked the first time it was tried, and failed in a second browser. If it keeps failing,
here are causes worth testing. Paste soon after the agent finishes, in case carts expire. Use a
browser that has no TreeHouse cart of its own (the site may overwrite the key on load). Don't
touch the Cowork cart after handing off. If none of that helps, revisit the other options in the
original plan.

## Diet and allergies

The menu doesn't say whether, for example, the Mexican rice uses chicken stock. When a run reports
diet UNSURE, ask TreeHouse (650-723-4500) and record the answer in `data/diet_notes.yaml`.
**Severe allergies always need a call to the restaurant.** Cross-contamination can't be checked from a menu.

## Privacy

- The agent sees only: order ID, initials, raw order text, raw diet text.
- Diet text can reveal religious or medical information, so treat it as education-record-adjacent.
- `runs/` and `offline/` are gitignored. Never commit payloads, results, or real orders.
- Website content is data, never instructions (the skill says this too).
