#!/bin/bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
UDID="${STORE_SHOTS_UDID:-D6BB604A-D6DD-46B4-A3E2-DA906CA5A877}"
RAW="$ROOT/store-assets/app-store/raw"
mkdir -p "$RAW"

open_url() {
  xcrun simctl openurl "$UDID" "autocoremobile://$1" >/dev/null
}

shot() {
  local name="$1"
  sleep 2.4
  xcrun simctl io "$UDID" screenshot "$RAW/$name"
  echo "captured $name"
}

xcrun simctl boot "$UDID" 2>/dev/null || true
xcrun simctl bootstatus "$UDID" -b
xcrun simctl ui "$UDID" appearance dark

# Login first (preview session still seeded — login screen is its own route).
open_url "store-shots"
shot "01-login.png"

open_url "work"
shot "02-work.png"

open_url "objects/engines"
shot "03-engines.png"

open_url "scan"
shot "04-scan.png"

open_url "accounting"
shot "05-finance.png"

open_url "paywall"
shot "06-paywall.png"

python3 "$ROOT/scripts/store-screenshots/compose.py" "$RAW" "$ROOT/store-assets/app-store/iphone-6.5"
echo "done → $ROOT/store-assets/app-store/iphone-6.5"
