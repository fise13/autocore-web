#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FUNCTIONS_DIR="${FUNCTIONS_DIR:-$ROOT/firebase/functions}"

if [[ ! -d "$FUNCTIONS_DIR" ]]; then
  echo "Functions dir not found: $FUNCTIONS_DIR"
  exit 1
fi

echo "Building billing functions in $FUNCTIONS_DIR"
cd "$FUNCTIONS_DIR"
npm install
npm run build

cd "$ROOT"

if ! command -v firebase >/dev/null 2>&1; then
  FIREBASE_BIN="npx -y firebase-tools@latest"
else
  FIREBASE_BIN="firebase"
fi

echo "Deploying marketing billing callables…"
$FIREBASE_BIN deploy --only functions:billing:createMarketingCheckoutSession,functions:billing:claimMarketingCheckout

echo "Optional: deploy legacy billing callables from AutoCore/firebase if needed:"
echo "  FIREBASE_DIR=../AutoCore/firebase firebase deploy --only functions:createCheckoutSession,functions:createBillingPortalSession,functions:syncCompanyBilling,functions:stripeWebhook"
