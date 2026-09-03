# Deep links — Universal Links and web fallback

One canonical URL space serves web, iOS, and the Mac desktop shell.
`https://app.myautocore.com/work-orders/123` names the same resource everywhere;
if a native app is installed the link opens that app, otherwise it opens the
page in the browser. The same URL is the Handoff payload, so a work order
started on iPhone continues on Mac (and the other way around).

## Architecture

```
HTTPS URL / Handoff webpageURL
   │
   ├── iOS, app installed ─────────────────────────────────────────────┐
   │     app/+native-intent.tsx        redirectSystemPath()            │
   │       ├── public link  → Expo Router path, routed immediately     │
   │       └── private link → parked in lib/deep-links/                │
   │                          pending-deep-link.ts, routing cancelled  │
   │                                    │                              │
   │     AuthGate (session restored, company resolved, billing settled)│
   │       └── providers/deep-link-head.tsx → guardedPush(target) ─────┘
   │
   ├── macOS, AutoCore.app installed
   │     Associated Domains → Tauri RunEvent::Opened
   │       └── src-tauri/src/deep_link.rs → product origin + path
   │             ├── emit autocore:deep-link (React router.replace)
   │             └── open_main_window (webview navigate)
   │
   └── no app, or an excluded path → browser
         signed in  → the page
         signed out → /login?next=<path> → the page after sign-in
```

The URL → route table lives in exactly one place,
[`autocore-mobile/lib/deep-links/canonical-deep-links.ts`](../autocore-mobile/lib/deep-links/canonical-deep-links.ts).
Universal Links, Handoff (`handoff-canonical.ts` reverse-maps Expo routes back
to that table), push notification payloads
([`services/notifications/deep-link-resolver.ts`](../autocore-mobile/services/notifications/deep-link-resolver.ts))
and in-app navigation all resolve through it. `src/lib/mobile/universal-links.ts`
generates the `apple-app-site-association` from the same list, and
`src/lib/mobile/universal-links.test.ts` fails the build if the two drift apart.

## Supported routes

Claimed on **both** `myautocore.com` and `app.myautocore.com` unless noted.

| Canonical URL | Web screen | iOS screen (Expo Router) | Dynamic params | Auth |
| --- | --- | --- | --- | --- |
| `/` | Overview | `/(tabs)` | — | yes |
| `/work-orders` | Work orders | `/orders` | — | yes |
| `/work-orders/:id` | Work order | `/orders/[id]` | `id` | yes |
| `/warehouse` | Warehouse | `/warehouse` | — | yes |
| `/motors` | Motors | `/objects/engines` | — | yes |
| `/engine-intake` | Engine intake | `/intake` | — | yes |
| `/accounting` | Accounting | `/(tabs)/accounting` | — | yes |
| `/my-earnings` | My earnings | `/earnings` | — | yes |
| `/team` | Team | `/(tabs)/profile/team` | — | yes |
| `/settings` | Settings | `/(tabs)/profile` | — | yes |
| `/ai` | AI workspace | `/(tabs)/ai` | — | yes |
| `/import` | Import | `/import` | `?batchId` | yes |
| `/imports` | Imports | `/import` | — | yes |
| `/imports/batch/:batchId` | Import batch | `/import?batchId=` | `batchId` | yes |
| `/invite/:token` | Invite accept | `/invite/[token]` | `token` | **no** |
| `/join` | Join company | `/join` | `?token`, `?invite` | **no** |

`/` is claimed on `app.myautocore.com` only — claiming the marketing root would
open the app instead of the public site.

### Deliberately not claimed

These open in the browser, by design:

- **Auth and browser-owned flows** — `/login`, `/auth/*`, `/demo`, `/deck/*`,
  `/api/*`, `/render/*`, `/documents/*`, `/migration`, `/warranty/*`,
  `/.well-known/*`. Claiming `/login` or `/auth/*` would break web sign-in.
- **Marketing pages** — `/product`, `/modules`, `/pricing`, `/security`,
  `/contact`, `/legal/*`, `/marketing/*`.
- **Web-only workspace screens with no mobile equivalent** — `/documents`,
  `/quotes`, `/sold`, `/roles`, `/activity`, `/status`, `/help`, `/changelog`,
  `/specific/*`, `/media/*`, `/imports/[id]`. Claiming a path the app cannot
  render would swallow the link instead of showing the real page.
- **`?mode=browser`** on any URL — Apple's standard escape hatch, honoured first.

## Auth behaviour

| Scenario | Result |
| --- | --- |
| A — app installed, signed in | App opens the screen |
| B — app installed, signed out | App opens login; the link is parked and replayed after sign-in |
| C — no app, signed in on web | Browser opens the page |
| D — no app, signed out | Browser → `/login?next=<path>` → the page after sign-in |
| E — cold start, session still restoring | Link is parked, never routed early, replayed once the session and company resolve |
| F — app already open | Existing instance navigates; `guardedPush` prevents duplicate stack entries |

Deep links never bypass authentication. `DeepLinkHead` renders only inside the
authenticated tree, so a parked link cannot paint a screen ahead of the auth
gate, and web destinations still pass through `RequireAuth` and RBAC
(`RequireAppAccess`) on arrival. Credential-shaped query values (`token`,
`access_token`, `id_token`, `session`, `code`, …) are stripped before
navigation; `/invite/:token` keeps its path segment because that is an
invitation id redeemed server-side, not a session.

## Query parameters, encoding, case

- Query params are forwarded to the destination screen
  (`/work-orders/123?tab=parts` → `/orders/123?tab=parts`).
- Route segments match case-insensitively; ids keep their exact bytes.
- Trailing slashes, duplicate slashes and `#fragments` are normalized away.
- Percent-encoded ids are decoded; malformed encoding is passed through rather
  than throwing.
- Unknown paths on our own hosts fall back to Home — never `+not-found`, never a
  crash. On the web they hit the existing 404.

## apple-app-site-association

Served by [`src/app/.well-known/apple-app-site-association/route.ts`](../src/app/.well-known/apple-app-site-association/route.ts)
on both origins from the same Vercel deployment. `middleware.ts` excludes
`.well-known` from its matcher, so nothing rewrites, redirects or gates it. The
body varies by `Host` (only the app origin claims `/`), so the route is
`force-dynamic` with `Vary: Host`.

Verify a deployment:

```bash
curl -sS -D - -o /dev/null https://app.myautocore.com/.well-known/apple-app-site-association
```

Expect `HTTP/2 200`, `content-type: application/json`, and no `location:` header.

```bash
curl -sS https://app.myautocore.com/.well-known/apple-app-site-association | python3 -m json.tool
```

Expect `appIDs` to list both native clients, and `activitycontinuation.apps` to
list the same two IDs (Handoff will not deliver a browsing-web activity without
that block):

```
45W7LA3QFP.com.wise.autocore.mobile
45W7LA3QFP.com.wise.autocore.desktop
```

## Associated Domains

### iOS

`autocore-mobile/plugins/with-ios-universal-links.js` writes
`com.apple.developer.associated-domains` during prebuild:

```
applinks:app.myautocore.com
applinks:myautocore.com
activitycontinuation:app.myautocore.com
activitycontinuation:myautocore.com
```

Both origins are claimed because iOS does **not** follow redirects when
deciding to open an app — `myautocore.com/work-orders/123` 301s to the app host
in a browser, but a Universal Link tap has to match the origin in the link.

Set `EXPO_PUBLIC_ENABLE_UNIVERSAL_LINKS=0` to drop the entitlement when signing
against a provisioning profile that lacks the capability.

### macOS

The same two `applinks:` entries live in [`src-tauri/entitlements.plist`](../src-tauri/entitlements.plist), plus `activitycontinuation:` for the same hosts (required for Handoff `webpageURL`). Development-signed local builds use [`src-tauri/entitlements.development.plist`](../src-tauri/entitlements.development.plist) with `?mode=developer` so macOS fetches AASA from the origin instead of Apple's CDN. `scripts/sign-tauri-macos.mjs` picks that file when the identity is Apple Development.

The Mac App ID `com.wise.autocore.desktop` must have **Associated Domains**
enabled in Apple Developer, and the Mac development / Developer ID profile
must be regenerated afterwards. Signing fails if the entitlement is present
and the profile is not.

The desktop shell used to leave `https://` to Safari on purpose. That is no
longer true for **claimed** product paths: Mac now participates in the same
Universal Link space as iPhone. `/login`, `/auth/*`, marketing pages and
`?mode=browser` are still excluded so web OAuth and the Safari escape hatch
keep working.

Custom scheme `autocore://` remains registered for OAuth-style callbacks that
are not HTTPS.

## Handoff (continue on Mac / iPhone)

Continuity uses Apple's browsing-web user activity, not a custom activity
type. Tauri's macOS event loop (tao) only continues
`NSUserActivityTypeBrowsingWeb`; a custom type would open on iPhone and be
dropped on Mac.

| Direction | Publish | Receive |
| --- | --- | --- |
| iPhone | `HandoffHead` → `AppleContinuity.setWebpageURL` with the canonical `https://app.myautocore.com/...` for the current Expo route | Universal Link → `+native-intent.tsx` (existing) |
| Mac | `DesktopShellProvider` → `desktop_handoff_set_url` from `window.location` | `RunEvent::Opened` → `deep_link.rs` (same as a Universal Link) |

Rules:

- `webpageURL` is the canonical HTTPS URL. No tokens, cookies, or Firebase IDs.
- Login, `/auth/*`, and screens with no claimed web URL (engine detail, scan)
  clear the activity instead of advertising a dead target.
- Signed-out receive still goes through the auth gate (`/login?next=` on web;
  parked deep link on iOS). Handoff does not bypass RBAC.
- `NSUserActivityTypes` on both Info.plists lists `NSUserActivityTypeBrowsingWeb`.

Activity type `com.wise.autocore.viewing` is reserved for later (Spotlight /
custom userInfo) and is **not** published today, because Mac would ignore it.

## Testing on a physical iPhone or Mac

Universal Links do not work in the iOS Simulator and behave differently in a
debug build with a development profile. Test a Release/TestFlight build.

1. **Install a release build** — `npm run ios:release` on a connected device, or
   a TestFlight build.
2. **Confirm the phone downloaded the AASA.** iOS fetches it at install time via
   Apple's CDN and caches it. On a Mac with the device attached:
   ```bash
   sudo log collect --device --start "$(date -v-5M '+%Y-%m-%d %H:%M:%S')" --output aasa.logarchive
   log show aasa.logarchive --predicate 'subsystem == "com.apple.swcd"' --info --last 5m
   ```
   Look for `app.myautocore.com` with a successful fetch.
3. **Open the link from another app** — Notes, Messages or Mail. Typing the URL
   into Safari's address bar *never* opens an app; that is expected iOS
   behaviour and is not a failure of the configuration. From Safari, pull down
   on the page to reveal the "Open in AutoCore" banner instead.
4. **On a Mac development build**, quit Safari, install the new `.app` (not by
   typing the URL), open it once, then tap a Notes link such as
   `https://app.myautocore.com/work-orders`. Do not replace `/Applications/AutoCore.app`
   if that bundle is a different product (`fise.AutoCore`); use `~/Applications`
   instead. Reinstall after every Associated Domains change so `swcd` re-fetches.
5. **Test each scenario** — signed in, signed out, cold start (swipe the app out
   of the app switcher first), warm start, and a link with query params.

### Resetting a cached AASA

iOS caches the association aggressively, and Apple's CDN caches it for up to
24 hours. If a change is not picked up:

- Delete and reinstall the app (this re-fetches the association), **or**
- Settings → Developer → Universal Links → Diagnostics, paste the URL and check
  the verdict (requires Developer Mode enabled on the device), **or**
- For a development build only, add `?mode=developer` to the associated domain
  (`applinks:app.myautocore.com?mode=developer`) to bypass Apple's CDN and fetch
  the file directly from the server. Never ship that to the App Store.

## Manual steps outside this repo

- **Apple Developer → Identifiers → `com.wise.autocore.mobile`** must have the
  **Associated Domains** capability enabled, and the provisioning profiles must
  be regenerated afterwards (`npm run ios:provision`). Without it, signing a
  build with the entitlement fails.
- **Apple Developer → Identifiers → `com.wise.autocore.desktop`** needs the
  same **Associated Domains** capability, then a new Mac development /
  Developer ID profile. Embed it with `scripts/sign-tauri-macos.mjs` after
  `tauri build`.
- Nothing is required in App Store Connect.
- Android App Links remain limited to the existing invite/join/import paths and
  stay unverified until `ANDROID_APP_LINKS_SHA256` is set on Vercel.

## Known limitations

- `/work-orders/:id?tab=parts` forwards `tab` to the order screen, which does
  not currently read it — the link opens the order, not the Parts tab.
- Mobile-only screens (warehouse location detail, engine detail, intake session)
  have no canonical web URL and therefore cannot be deep-linked or handed off.
- Deep links land after billing settles. On a workspace without an active
  subscription the paywall is shown instead of the app tree, so the link stays
  parked until the paywall clears or its 15-minute window expires.
