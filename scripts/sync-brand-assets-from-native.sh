#!/usr/bin/env bash
# Copies brand PNGs from AutoCore native Assets.xcassets into autocore-web/assets/.
# Optional maintenance — web build does NOT depend on this script or native paths.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
WEB="$ROOT/autocore-web"
NATIVE="$ROOT/AutoCore/Assets.xcassets"

copy() {
  local src="$1" dst="$2"
  if [[ -f "$src" ]]; then
    cp "$src" "$dst"
    echo "  ✓ $(basename "$dst")"
  else
    echo "  ⚠ skip (missing): $src" >&2
  fi
}

echo "Syncing brand assets → autocore-web/assets/"

copy "$NATIVE/AppIcon.appiconset/icon_512x512.png" "$WEB/assets/icons/app-icon.png"
copy "$NATIVE/AppIcon.appiconset/icon_512x512_dark.png" "$WEB/assets/icons/app-icon-dark.png"
copy "$NATIVE/LoginLogo.imageset/login-transparent.png" "$WEB/assets/branding/login-logo-transparent.png"
copy "$NATIVE/LoginLogo.imageset/login.png" "$WEB/assets/branding/login-logo.png"

if [[ -f "$WEB/assets/branding/login-logo.png" ]]; then
  echo "  → generating favicon / touch icon from login-logo.png"
  sips -z 32 32 "$WEB/assets/branding/login-logo.png" --out "$WEB/assets/meta/favicon.png" >/dev/null
  sips -z 180 180 "$WEB/assets/branding/login-logo.png" --out "$WEB/assets/meta/apple-touch-icon.png" >/dev/null
  sips -z 512 512 "$WEB/assets/branding/login-logo.png" --out "$WEB/assets/icons/app-icon.png" >/dev/null
  cp "$WEB/assets/icons/app-icon.png" "$WEB/assets/icons/app-icon-dark.png"
  cp "$WEB/assets/meta/favicon.png" "$WEB/public/favicon.png"
  echo "  ✓ favicon.png, apple-touch-icon.png, app-icon.png"
fi

echo "Done."
