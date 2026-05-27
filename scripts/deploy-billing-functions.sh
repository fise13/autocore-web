#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
FIREBASE_DIR="${FIREBASE_DIR:-$ROOT/../AutoCore/firebase}"

if [[ ! -d "$FIREBASE_DIR" ]]; then
  echo "Firebase dir not found: $FIREBASE_DIR"
  echo "Set FIREBASE_DIR to your AutoCore/firebase path."
  exit 1
fi

echo "Deploying Stripe billing functions from $FIREBASE_DIR"
cd "$FIREBASE_DIR"

if ! command -v firebase >/dev/null 2>&1; then
  echo "firebase CLI not found. Install: npm i -g firebase-tools"
  exit 1
fi

firebase deploy --only functions:createCheckoutSession,functions:createBillingPortalSession,functions:syncCompanyBilling,functions:stripeWebhook

echo "Done. Run billing backfill:"
echo "  cd $ROOT && npm run migrate:billing -- --dry-run"
