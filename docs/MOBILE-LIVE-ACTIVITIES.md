# Live Activities — iOS (AutoCore Mobile)

Widget kit (Lock Screen accessories, Home Screen, design, QA): [MOBILE-WIDGETS.md](MOBILE-WIDGETS.md).

`expo-widgets` adds target **ExpoWidgetsTarget** (`com.wise.autocore.mobile.widgets`) and App Group
`group.com.wise.autocore.mobile` on both the app and the extension.

## Symptom

```text
Provisioning Profile "iOS Team Provisioning Profile: *" does not support the App Groups capability.
Provisioning profile ... doesn't support the group.com.wise.autocore.mobile App Group.
(in target 'ExpoWidgetsTarget')
```

Wildcard / Team profile **cannot** sign App Groups. You need explicit App IDs + the App Group
registered on the team, then Automatic Signing will mint proper profiles.

## 1. Apple Developer — App Group

1. [developer.apple.com](https://developer.apple.com) → **Certificates, Identifiers & Profiles** → **Identifiers**.
2. Filter **App Groups** (or **+** → **App Groups**).
3. Register: `group.com.wise.autocore.mobile` → **Continue** → **Register**.

## 2. Main App ID

1. **Identifiers** → App IDs → `com.wise.autocore.mobile`.
2. Enable **App Groups** → **Configure** → select `group.com.wise.autocore.mobile` → **Save**.
3. If listed, enable **Live Activities** (or rely on `NSSupportsLiveActivities` in Info.plist — already set in `app.config.ts`).
4. Keep existing **Push Notifications** / **Sign in with Apple** as before.

## 3. Widget extension App ID

Xcode may already have registered:

`com.wise.autocore.mobile.ExpoWidgetsTarget`

(name like **XC com wise autocore mobile ExpoWidgetsTarget**). Prefer that ID —
`app.config.ts` / `expo-widgets` is aligned to it.

1. Open that App ID (or create Explicit `com.wise.autocore.mobile.ExpoWidgetsTarget` if missing).
2. Enable **App Groups** → configure → `group.com.wise.autocore.mobile`.
3. **Save**.

## 4. Refresh provisioning (CLI)

From `autocore-mobile`:

```bash
npm run ios:provision
# or with a connected device UDID:
bash scripts/ios-refresh-provisioning.sh <DEVICE_UDID>
```

Then:

```bash
npm run ios:release --device
```

Xcode Automatic Signing (`CODE_SIGN_STYLE=Automatic` + `-allowProvisioningUpdates`) creates/updates
**explicit** profiles for both `com.wise.autocore.mobile` and `com.wise.autocore.mobile.widgets`.

## Config reference

| Item | Value |
| --- | --- |
| App | `com.wise.autocore.mobile` |
| Widgets | `com.wise.autocore.mobile.ExpoWidgetsTarget` |
| App Group | `group.com.wise.autocore.mobile` |
| Team | `45W7LA3QFP` |
| Plugin | `expo-widgets` in `app.config.ts` |
