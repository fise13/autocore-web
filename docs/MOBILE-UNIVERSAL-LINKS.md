# Universal Links (iOS) / App Links (Android)

Invite emails use `https://app.myautocore.com/invite/{token}`.
With Universal Links configured, tapping the link on iPhone opens **AutoCore Mobile** instead of Safari.

## 1. Apple Developer — App ID capability

1. [developer.apple.com](https://developer.apple.com) → **Identifiers** → `com.wise.autocore.mobile`
2. Enable **Associated Domains** → **Save**
3. In `autocore-mobile/.env.local` set:

```bash
EXPO_PUBLIC_ENABLE_UNIVERSAL_LINKS=true
```

4. Regenerate provisioning profile:

```bash
cd autocore-mobile
npm run ios:provision
```

## 2. Rebuild the iOS app

Associated Domains entitlement is added by `plugins/with-ios-universal-links.js` when `EXPO_PUBLIC_ENABLE_UNIVERSAL_LINKS=true`.

**Local device builds** omit Associated Domains by default so Xcode automatic signing works without the capability on the App ID.

```bash
cd autocore-mobile
npm run ios:release --device
```

## 3. Deploy web (AASA file)

Production must serve the Apple association file:

```bash
curl -sI https://app.myautocore.com/.well-known/apple-app-site-association
# Expect: HTTP 200, Content-Type: application/json
```

Route: `src/app/.well-known/apple-app-site-association/route.ts`

Paths that open the app:

- `/invite/*`
- `/join?token=…` (legacy)

## 4. Verify on iPhone

1. Send a team invite email (or copy invite URL).
2. Open Mail → tap **Принять приглашение**.
3. App should open on the invite screen (`/invite/[token]`).
4. If not logged in — login/signup in-app, then accept.

**Note:** Universal Links do not work when tapping the same URL in Safari address bar (Apple limitation). Test from Mail, Messages, or Notes.

### Troubleshooting

- Delete app → reinstall (iOS caches AASA on install).
- Settings → AutoCore → **Open by Default** / **Universal Links** should be enabled.
- Confirm entitlements contain `applinks:app.myautocore.com` (Xcode → Signing & Capabilities).

## Android (optional)

Set `ANDROID_APP_LINKS_SHA256` on Vercel (release keystore fingerprint from `eas credentials -p android`).
Verify: `https://app.myautocore.com/.well-known/assetlinks.json`
