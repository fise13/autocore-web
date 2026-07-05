# Sign in with Apple — iOS (AutoCore Mobile)

Кнопка «Продолжить с Apple» на экране входа требует **нативной capability** и **корректного provisioning profile**. Wildcard-профиль `iOS Team Provisioning Profile: *` **не поддерживает** Sign in with Apple.

## 1. Apple Developer

1. Откройте [developer.apple.com](https://developer.apple.com) → **Certificates, Identifiers & Profiles** → **Identifiers**.
2. Найдите или создайте App ID: `com.wise.autocore.mobile`.
3. Включите capability **Sign in with Apple** → Save.

> Для TestFlight и App Store нужна платная подписка Apple Developer Program ($99/год). Для разработки на симуляторе/устройстве с Automatic Signing Xcode часто регистрирует App ID сам.

## 2. Xcode (после `npx expo prebuild`)

1. Откройте `ios/AutoCore.xcworkspace` в Xcode.
2. Target **AutoCore** → **Signing & Capabilities**.
3. Включите **Automatically manage signing**, выберите **Team** `45W7LA3QFP`.
4. Убедитесь, что **Bundle Identifier** = `com.wise.autocore.mobile`.
5. Capability **Sign in with Apple** должна быть в списке (плагин `with-optional-apple-sign-in` добавляет её в проект).
6. Проверьте `ios/AutoCore/AutoCore.entitlements` — ключ `com.apple.developer.applesignin`.

### Release-сборка (важно)

Ошибка `Provisioning Profile "iOS Team Provisioning Profile: *"` означает, что Xcode использует **wildcard-профиль** вместо профиля для `com.wise.autocore.mobile`.

**Обязательно:**
- Платная подписка **Apple Developer Program** (Personal Team / бесплатный Apple ID не выдаёт профиль с Sign in with Apple для Release).
- В [developer.apple.com](https://developer.apple.com) → Identifiers → `com.wise.autocore.mobile` → **Sign in with Apple** включён.
- Xcode → Settings → Accounts → **Download Manual Profiles** — или **без Xcode** (см. ниже).

Для Release в проекте задано `CODE_SIGN_STYLE = Automatic` и `Apple Development` — Xcode сам выбирает сертификат. **Не задавайте `Apple Distribution` вручную** при automatic signing: `expo run:ios` упадёт с конфликтом.

### Без Xcode (CLI)

Если Xcode не открывается или **Download Manual Profiles** ничего не делает — профиль создаётся через `xcodebuild`:

```bash
cd autocore-mobile
npm run ios:provision
# или с конкретным устройством:
bash scripts/ios-refresh-provisioning.sh 00008120-0014255811E2201E
```

Флаг `-allowProvisioningUpdates` обращается к Apple и создаёт explicit-профиль `com.wise.autocore.mobile` (не wildcard `*`).

Локальный Release (оптимизированная сборка на устройство/симулятор):
```bash
npm run ios:release
# или: npx expo run:ios --device --configuration Release
```

TestFlight / App Store — через EAS (там подставится Distribution profile):
```bash
npx eas-cli build --platform ios --profile production
```

## 3. Пересборка из CLI

```bash
cd autocore-mobile
npx expo prebuild --platform ios
cd ios && pod install && cd ..
npx expo run:ios
```

Переменная в `.env.local`:

```
EXPO_PUBLIC_ENABLE_APPLE_SIGN_IN=true
```

Отключить только для временной локальной сборки без capability: `false` или `0`.

## 4. Firebase

Firebase Console → **Authentication** → **Sign-in method** → **Apple** — те же **Team ID**, **Key ID**, **Services ID** (`com.wise.autocore.web`) и **.p8** ключ, что и для web.

В Firebase также должен быть зарегистрирован iOS App ID `com.wise.autocore.mobile`.

## 5. Production API

На проде мобилка обменивает Apple identity token через сервер (как web Apple JS):

`POST /api/mobile/auth/apple` → Firebase custom token.

Убедитесь, что route задеплоен на `EXPO_PUBLIC_API_BASE_URL` (например `https://app.myautocore.com`).

## 6. Проверка в приложении

- На iOS на экране входа должна появиться нативная кнопка Apple (чёрная/белая).
- Если кнопки нет: `AppleAuthentication.isAvailableAsync()` вернул `false` — проверьте entitlements и пересоберите нативный бинарник (не только Metro reload).

## Ошибки

| Симптом | Решение |
|--------|---------|
| `Provisioning Profile * does not support SignIn with Apple` | Explicit App ID + Automatic Signing, не wildcard |
| `AuthorizationError 1000` / `AKAuthenticationError -7026` | Capability не в entitlements или не пересобран ios |
| Кнопка не видна | `EXPO_PUBLIC_ENABLE_APPLE_SIGN_IN=true` + `expo run:ios` |
