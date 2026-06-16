#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/firebase/functions/.env"

if [[ -z "${STRIPE_SECRET_KEY:-}" ]]; then
  echo "Usage: STRIPE_SECRET_KEY=sk_test_... npm run setup:stripe-secret"
  exit 1
fi

cat > "$ENV_FILE" <<EOF
# Stripe secret for Firebase Functions (server-only, gitignored)
STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
EOF

echo "Saved STRIPE_SECRET_KEY to firebase/functions/.env"
echo "Deploy with: npm run deploy:billing-functions"
