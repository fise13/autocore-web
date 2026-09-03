# Shipping AutoCore Desktop

Architecture and security rationale: [DESKTOP-ARCHITECTURE.md](DESKTOP-ARCHITECTURE.md).

## Commands

```bash
npm run tauri:dev              # run against the configured origin
npm run tauri:test             # Rust unit tests (navigation policy, deep links, filenames)
npm run tauri:build            # release build for the host platform
npm run tauri:build:mac        # aarch64-apple-darwin
npm run tauri:build:mac-intel  # x86_64-apple-darwin
npm run tauri:build:win        # x86_64-pc-windows-msvc
```

Artifacts land in `src-tauri/target/<target>/release/bundle/` — `.app` + `.dmg`
on macOS, NSIS `.exe` on Windows, `.deb` + AppImage on Linux.
`npm run tauri:publish-downloads` copies the newest bundles into
`public/downloads/` for the marketing site.

**macOS DMG needs `CI=true` on machines that cannot script Finder.**
`bundle_dmg.sh` runs AppleScript to arrange the disk-image window and fails the
build when Finder automation is unavailable (headless sessions, sandboxes, or a
shell without Automation permission — the symptom is
`error running bundle_dmg.sh` right after `AutoCore.app` bundles fine, plus a
leftover `rw.*.dmg`). `CI=true` makes the bundler skip that cosmetic step:

```bash
CI=true npm run tauri:build:mac
```

The resulting DMG is functionally identical; only the Finder window layout is
unstyled. CI runners set `CI` themselves, so this only bites locally.

Developing against a local server:

```bash
DESKTOP_APP_URL=http://localhost:3000 npm run tauri:dev
```

Localhost is granted native access only in debug builds.

## What the build reads from the environment

`scripts/tauri-build.mjs` wraps the CLI so nothing below is ever committed. It
passes updater settings as a `--config` patch, leaving `tauri.conf.json` clean.

| Variable | Required for | Notes |
|---|---|---|
| `DESKTOP_APP_URL` | choosing the target origin | Defaults to `NEXT_PUBLIC_APP_URL`, then `https://app.myautocore.com` |
| `TAURI_UPDATER_ENDPOINT` | auto-update | Manifest URL; supports `{{target}}`, `{{arch}}`, `{{current_version}}` |
| `TAURI_UPDATER_PUBKEY` | auto-update | Public key from `npx tauri signer generate` |
| `TAURI_SIGNING_PRIVATE_KEY` | auto-update | **CI secret.** Read by the CLI to sign artifacts |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | auto-update | **CI secret** |
| `APPLE_CERTIFICATE` | macOS signing | base64 `.p12`, **CI secret** |
| `APPLE_CERTIFICATE_PASSWORD` | macOS signing | **CI secret** |
| `APPLE_SIGNING_IDENTITY` | macOS signing | e.g. `Developer ID Application: … (TEAMID)` |
| `APPLE_ID` / `APPLE_PASSWORD` / `APPLE_TEAM_ID` | notarization | App-specific password, **CI secrets** |

`TAURI_UPDATER_ENDPOINT` and `TAURI_UPDATER_PUBKEY` must be set **together** —
the build fails fast otherwise, rather than shipping a binary that claims update
support and fails at runtime.

Nothing secret may enter the bundle. A desktop app ships to users and its
contents can be extracted: Firebase service-account keys, Stripe keys and the
updater private key belong in Vercel / Firebase / CI only. The bundle carries the
same public `NEXT_PUBLIC_FIREBASE_*` values the web app already exposes, and
those are protected by Firestore rules, not by secrecy.

## Remaining work before public distribution

The app builds and runs today. These are the gaps between "runs on this machine"
and "installable by a customer":

1. **Apple Developer ID signing + notarization.** Ad-hoc unsigned builds are
   blocked by Gatekeeper **and** fail native Sign in with Apple
   (`AuthenticationServices` error 1000). The Mac App ID is
   `com.wise.autocore.desktop` with Sign in with Apple (team `45W7LA3QFP`).
   Local runs need an Apple Development signature, `entitlements.plist` (Sign
   in with Apple **and** Associated Domains, including `activitycontinuation`
   for Handoff), and a Mac development profile at
   `Contents/embedded.provisionprofile` that includes both capabilities.
   Enable **Associated Domains** on App ID `com.wise.autocore.desktop`, then
   regenerate the profile — signing fails if the entitlement is present and
   the profile is not. `npm run tauri:build:mac` calls
   `scripts/sign-tauri-macos.mjs` to embed that profile after Tauri signs the
   bundle, then `scripts/package-signed-tauri-dmg.mjs` rebuilds the DMG from
   the signed `.app` (Tauri writes the disk image *before* that re-sign).
   Development identities use `entitlements.development.plist` (`?mode=developer`)
   so Universal Links fetch AASA from the origin. The Sign in with Apple plugin is
   vendored at `src-tauri/vendor/tauri-plugin-siwa` so the system sheet is
   attached to a visible window (the crates.io build could hang the login
   spinner forever). Customer builds need a Developer ID
   Application certificate and the `APPLE_*` variables above.
2. **Updater keypair.** `npx tauri signer generate`, private key into CI secrets,
   public key into `TAURI_UPDATER_PUBKEY`.
3. **An update manifest endpoint.** `TAURI_UPDATER_ENDPOINT` has no server behind
   it yet. Until then builds ship with the updater absent and the app reports
   `updaterEnabled: false`, so "Check for Updates" reports honestly instead of
   failing.
4. **Windows code signing** (Authenticode) so SmartScreen does not warn.
5. **A release CI workflow.** No workflow builds desktop artifacts today;
   `.github/workflows/ci.yml` covers the web checks only.
6. **Windows and Linux verification.** Configured, compiled for, never run.

Mac App Store distribution is a separate track and is not set up: it would need a
sandboxed build, an App Store provisioning profile, and `entitlements.plist`
extended with `com.apple.security.app-sandbox` plus network entitlements.
Developer ID distribution outside the store is the shorter path and is what the
variables above target.

## Verification checklist

Run after any change to `src-tauri/` or `src/platform/`:

```bash
npm run typecheck && npm run test && npm run tauri:test
npm run build                  # the web build must keep passing
npm run tauri:dev              # window opens, app loads, sign-in works
```

Then, in the running app: ⌘C/⌘V in a grid, ⌘S and ⌘P on a document preview,
export a PDF and a CSV (native dialog appears, file lands where chosen), click a
support link (opens in the system browser), open a document preview (opens a
second app window), resize and restart (geometry restored), toggle macOS
appearance (theme follows), `open autocore://work-orders` (focuses the app and
navigates), and — on a signed build with Associated Domains — a Notes link to
`https://app.myautocore.com/work-orders` plus Handoff from the iPhone app
(open a work order on the phone, then look for AutoCore on the Mac Dock;
Safari's address bar will never open the app). The shell boots at `/home`, not
`/login`, so a signed-in session does not flash the login form.
