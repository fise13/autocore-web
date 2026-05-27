# AutoCore Web — Assets

**Независимая копия** брендовых ресурсов для веб-приложения.

`autocore-web` деплоится отдельно и **не ссылается** на `AutoCore/Assets.xcassets` (iOS/macOS).  
Файлы здесь — **намеренные дубликаты**: при смене бренда обновляйте и web, и native.

## Структура

```
assets/
  icons/
    app-icon.png          — копия login-logo (512×512, для совместимости)
    app-icon-dark.png
  branding/
    login-logo.png        — **основная иконка web** (AppLogo, favicon)
    login-logo-transparent.png
    logo.jpg              — доп. логотип (legacy)
  meta/
    favicon.png
    apple-touch-icon.png
```

## Использование в коде

```ts
import { brandAssets } from "@/lib/brand-assets";
```

- `AppLogo` и favicon — из `login-logo.png` (`brandAssets.logo`, `brandAssets.meta`)

## Native (iOS / macOS)

Иконки и логотипы для Swift остаются в:

- `AutoCore/Assets.xcassets/AppIcon.appiconset/`
- `AutoCore/Assets.xcassets/LoginLogo.imageset/`

Web **не читает** эти пути в runtime.

## Синхронизация (опционально)

Если обновили бренд в Xcode, можно скопировать PNG в web вручную или скриптом:

```bash
npm run assets:sync-from-native
```

Скрипт только копирует файлы в `assets/` — зависимости от monorepo в production нет.
