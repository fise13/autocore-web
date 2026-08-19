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

## 3. Пересобрать (обязательно для Push + Dynamic Island)

```bash
cd autocore-mobile
npm run ios:release --device
```

- Soft reload **не** обновляет widget extension (Island) и APNs entitlements.
- Нужен **физический iPhone** (симулятор не получает APNs / Live Activities как в проде).
- Открой приложение → разреши уведомления.

## 4. Проверка Firestore (device token)

```bash
cd ..   # корень autocore-web
FIREBASE_SERVICE_ACCOUNT_PATH=./autocore-6066c-firebase-adminsdk-fbsvc-f3b2116010.json \
npx tsx scripts/debug-notifications.ts YOUR_EMAIL
```

Ожидаем: `push devices: 1` с `ExponentPushToken[...]`.

## 5. Expo / APNs (для доставки remote push)

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

## 6. Dynamic Island (intake) — проверка на устройстве

Island читает intake outbox и активную сессию документирования. Presentation включена (`LIVE_ACTIVITY_PRESENTATION_ENABLED = true`). Приоритет: fail / blocked → session → upload → idle.

1. После `ios:release` открой Engine intake.
2. Начни документировать двигатель → Island: камера + `4/12`, без Gauge загрузки. Тап → Active.
3. Сфотографируй **офлайн** (без сессии) → Island: “Waiting for connection”.
4. Верни сеть → “Syncing”, затем Island гаснет когда outbox пуст и сессии нет.
5. Спровоцируй failed upload → Island: blocked / failed (даже если сессия ещё открыта).
6. Уведи приложение в фон с failed items → local notification “Sync failed” с deep link `autocoremobile://intake`.
7. Очисти/почини outbox → local notification снимается, Island idle.

**Важно:** intake sync **не** шлёт remote Expo push на каждый тик — UX sync = Island + local при failed в фоне. Remote push остаётся для work orders / team / system events.

## 7. Если remote push всё ещё не приходит

1. Settings → Notifications → AutoCore → разрешено.
2. `debug-notifications.ts` показывает token.
3. APNs key загружен в EAS (шаг 5).
4. Deploy Firebase Function `onNotificationCreatedPush` (backup если Next.js dispatch упал).
5. Не тестируй на симуляторе / Expo Go.

## Xcode (альтернатива CLI)

1. `open ios/AutoCore.xcworkspace`
2. Target **AutoCore** → **Signing & Capabilities**
3. **+ Capability** → **Push Notifications**
4. **Automatically manage signing**, Team `45W7LA3QFP`
