#!/usr/bin/env bash
#
# Copy the three App Store Server API credentials from .env.local into Vercel.
#
# Run this yourself — it needs your Vercel login, and the values are secrets.
#
#   ./scripts/push-apple-env-to-vercel.sh                # production
#   ./scripts/push-apple-env-to-vercel.sh preview        # a different target
#
# Why a script instead of pasting into the dashboard: in .env.local the private
# key is wrapped in quotes, because that is the file's syntax and dotenv strips
# them on read. A dashboard stores what you paste, verbatim — so copying the
# line by hand carries the quotes into the value, and the key then fails at
# signing with `DECODER routines::unsupported`. That reads like a corrupt key
# rather than two stray characters, and it is a genuinely nasty half hour.
#
# This reads the value the same way dotenv does, so the quotes never travel.
# Newlines are kept in their escaped `\n` form, which both the current and the
# previous version of `readAppStoreCredentials()` accept — the first deploy
# after this therefore works whichever of the two is live at that moment.
#
# Values are piped straight into `vercel env add` and are never echoed.

set -euo pipefail

TARGET="${1:-production}"
ENV_FILE=".env.local"

cd "$(dirname "$0")/.."

if [[ ! -f "$ENV_FILE" ]]; then
  echo "No $ENV_FILE in $(pwd) — run this from the repository root." >&2
  exit 1
fi

if ! command -v vercel >/dev/null 2>&1; then
  VERCEL=(npx -y vercel@latest)
else
  VERCEL=(vercel)
fi

# Read one key the way dotenv does: last definition wins, matching surrounding
# quotes are syntax rather than value.
read_env() {
  python3 - "$ENV_FILE" "$1" <<'PY'
import sys
path, want = sys.argv[1], sys.argv[2]
found = None
for line in open(path, encoding="utf-8"):
    line = line.strip()
    if not line or line.startswith("#") or "=" not in line:
        continue
    key, value = line.split("=", 1)
    if key.strip() != want:
        continue
    value = value.strip()
    if len(value) >= 2 and value[0] in "\"'" and value[-1] == value[0]:
        value = value[1:-1]
    found = value
if found is None:
    sys.exit(1)
sys.stdout.write(found)
PY
}

for NAME in APPLE_APP_STORE_KEY_ID APPLE_APP_STORE_ISSUER_ID APPLE_APP_STORE_PRIVATE_KEY; do
  if ! VALUE="$(read_env "$NAME")"; then
    echo "✗ $NAME is not set in $ENV_FILE" >&2
    exit 1
  fi

  # Length only. Never the value.
  echo "→ $NAME (${#VALUE} chars) → $TARGET"

  # Remove an existing value first; `vercel env add` refuses to overwrite.
  "${VERCEL[@]}" env rm "$NAME" "$TARGET" --yes >/dev/null 2>&1 || true
  printf '%s' "$VALUE" | "${VERCEL[@]}" env add "$NAME" "$TARGET" >/dev/null

  echo "  ✓ set"
done

echo
echo "Names now on $TARGET (values are never printed by Vercel):"
"${VERCEL[@]}" env ls "$TARGET" 2>/dev/null | grep -i "APPLE_APP_STORE" || true

echo
echo "Environment variables only apply to a NEW build. Deploy to pick them up:"
echo "  ${VERCEL[*]} --prod"
