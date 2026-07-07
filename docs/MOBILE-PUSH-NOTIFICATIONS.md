# Push Notifications — iOS (AutoCore Mobile)

Ошибка сборки:

```
Provisioning Profile does not support the Push Notifications capability.
Entitlements file defines "aps-environment" which is not registered for profile
```

Значит у App ID `com.wise.autocore.mobile` **не включён Push** в Apple Developer, а профиль подписи ещё старый.

## 1. Apple Developer (обязательно, ~1 мин)

1. [developer.apple.com](https://developer.apple.com) → **Certificates, Identifiers & Profiles** → **Identifiers**.
2. Открой `com.wise.autocore.mobile`.
3. Включи **Push Notifications** → **Save**.

## 2. Обновить provisioning profile (CLI)

```bash
cd autocore-mobile
npm run ios:provision
```

Скрипт вызывает `xcodebuild -allowProvisioningUpdates` — Apple пересоздаст профиль с Push.

## 3. Пересобрать

```bash
npm run ios:release --device
```

Открой приложение → разреши уведомления.

## 4. Проверка Firestore

```bash
cd ..   # корень autocore-web
FIREBASE_SERVICE_ACCOUNT_PATH=./autocore-6066c-firebase-adminsdk-fbsvc-f3b2116010.json \
npx tsx scripts/debug-notifications.ts YOUR_EMAIL
```

Ожидаем: `push devices: 1` с `ExponentPushToken[...]`.

## 5. Expo / APNs (для доставки push)

Проект EAS: `@fise13/autocore-mobile`  
`projectId`: `f13cbd47-6bc7-4eb4-b4ad-12dc7175018a`

Для production push через Expo загрузи APNs key (один раз):

```bash
cd autocore-mobile
npm run eas:login
npx eas credentials -p ios
# → Push Notifications → Set up / Upload key
```

Ключ создаётся в Apple Developer → **Keys** → **+** → **Apple Push Notifications service (APNs)**.

## Xcode (альтернатива CLI)

1. `open ios/AutoCore.xcworkspace`
2. Target **AutoCore** → **Signing & Capabilities**
3. **+ Capability** → **Push Notifications**
4. **Automatically manage signing**, Team `45W7LA3QFP`
