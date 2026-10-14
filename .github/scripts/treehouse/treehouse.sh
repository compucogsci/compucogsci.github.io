#!/usr/bin/env bash
# Local entry point for the TreeHouse order pipeline. Nothing here runs in GitHub Actions.
#
#   treehouse.sh prep [--session-date YYYY-MM-DD] [--pickup-time HH:MM] [--cost-limit 14.50]
#       Read the RSVP sheet and write runs/<date>/upload/ (attach its files to Cowork).
#   treehouse.sh check
#       Move cart_result.json + cart_report.md from runs/cowork_downloads/ (where you save
#       Cowork's downloads) into runs/<date>/, verify, and copy the cart snippet to the clipboard.
#   treehouse.sh skill
#       Zip .claude/skills/treehouse-cart into runs/treehouse-cart.zip for upload to Claude.
#
# Credentials come from the macOS Keychain (see README.md, "Setup"), or from the
# GOOGLE_SHEETS_CREDENTIALS / SHEET_ID env vars if those are already set.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$REPO_ROOT"
SCRIPTS=.github/scripts

ensure_deps() {
  [ -d "$SCRIPTS/node_modules" ] || (cd "$SCRIPTS" && npm install --silent)
}

keychain() {
  security find-generic-password -s "$1" -w 2>/dev/null \
    || { echo "Keychain item '$1' not found; see README.md Setup" >&2; exit 1; }
}

cmd="${1:-}"; shift || true
case "$cmd" in
  prep)
    ensure_deps
    GOOGLE_SHEETS_CREDENTIALS="${GOOGLE_SHEETS_CREDENTIALS:-$(keychain compucogsci-sheets-credentials)}" \
    SHEET_ID="${SHEET_ID:-$(keychain compucogsci-sheet-id)}" \
      node "$SCRIPTS/treehouse/prepare_orders.js" "$@"
    ;;

  check)
    ensure_deps
    INBOX=runs/cowork_downloads
    if [ -f "$INBOX/cart_result.json" ]; then
      SESSION_DATE="$(node -e 'process.stdout.write(String(require(process.argv[1]).session_date || ""))' "$REPO_ROOT/$INBOX/cart_result.json")"
      [[ "$SESSION_DATE" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]] || { echo "cart_result.json has no valid session_date" >&2; exit 1; }
      RUN_DIR="runs/$SESSION_DATE"
      [ -f "$RUN_DIR/upload/orders_payload.json" ] || { echo "No $RUN_DIR/upload/orders_payload.json; was prep run for $SESSION_DATE?" >&2; exit 1; }
      for f in cart_result.json cart_report.md; do
        if [ -f "$INBOX/$f" ]; then
          mv "$INBOX/$f" "$RUN_DIR/$f"
          echo "Moved $INBOX/$f -> $RUN_DIR/"
        fi
      done
    else
      # Nothing new in the inbox: re-check the most recent run.
      RUN_DIR="$(ls -d runs/20??-??-?? 2>/dev/null | sort | tail -1)"
      [ -n "$RUN_DIR" ] && [ -f "$RUN_DIR/cart_result.json" ] \
        || { echo "No cart_result.json in $INBOX/ (save Cowork's downloads there)" >&2; exit 1; }
      echo "Re-checking $RUN_DIR"
    fi
    node "$SCRIPTS/treehouse/verify_cart.js" "$RUN_DIR/upload/orders_payload.json" "$RUN_DIR/cart_result.json" --copy
    ;;

  skill)
    mkdir -p runs
    rm -f runs/treehouse-cart.zip
    (cd .claude/skills && zip -qr "$REPO_ROOT/runs/treehouse-cart.zip" treehouse-cart)
    echo "Wrote runs/treehouse-cart.zip. Upload it in Claude: Settings > Capabilities > Skills."
    ;;

  *)
    sed -n '2,13p' "$0" | sed 's/^# \{0,1\}//'
    exit 2
    ;;
esac
