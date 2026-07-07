#!/usr/bin/env bash
# Refresh iOS provisioning profiles without opening Xcode.
# Creates/updates the explicit profile for com.wise.autocore.mobile
# (Sign in with Apple + Push Notifications).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IOS_DIR="$ROOT/ios"
TEAM_ID="${DEVELOPMENT_TEAM:-45W7LA3QFP}"
BUNDLE_ID="${PRODUCT_BUNDLE_IDENTIFIER:-com.wise.autocore.mobile}"
DEVICE_ID="${1:-}"

DESTINATION="generic/platform=iOS"
if [[ -n "$DEVICE_ID" ]]; then
  DESTINATION="id=$DEVICE_ID"
fi

echo "→ Refreshing provisioning for $BUNDLE_ID (team $TEAM_ID)"
echo "→ Destination: $DESTINATION"
echo "→ Requires Push Notifications enabled on App ID in developer.apple.com"
echo "  See docs/MOBILE-PUSH-NOTIFICATIONS.md"

cd "$IOS_DIR"
xcodebuild \
  -workspace AutoCore.xcworkspace \
  -scheme AutoCore \
  -configuration Release \
  -destination "$DESTINATION" \
  -allowProvisioningUpdates \
  CODE_SIGN_STYLE=Automatic \
  DEVELOPMENT_TEAM="$TEAM_ID" \
  PRODUCT_BUNDLE_IDENTIFIER="$BUNDLE_ID" \
  build

echo "✓ Profile refreshed. Run: npm run ios:release"
