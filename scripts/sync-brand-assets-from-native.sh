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
copy "$NATIVE/LoginLogo.imageset/login-transparent.png" "$WEB/assets/meta/apple-touch-icon.png"
copy "$NATIVE/AppIcon.appiconset/icon_512x512.png" "$WEB/assets/meta/favicon.png"

echo "Done."
