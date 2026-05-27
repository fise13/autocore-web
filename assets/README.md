# AutoCore Web — Assets

**Независимая копия** брендовых ресурсов для веб-приложения.

`autocore-web` деплоится отдельно и **не ссылается** на `AutoCore/Assets.xcassets` (iOS/macOS).  
Файлы здесь — **намеренные дубликаты**: при смене бренда обновляйте и web, и native.

## Структура

```
assets/
  icons/
    app-icon.png          — иконка (светлая тема)
    app-icon-dark.png     — иконка (тёмная тема)
  branding/
    login-logo.png
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

- `AppLogo` — `@/components/brand/app-logo`
- Favicon / Apple Touch — `src/app/layout.tsx` через `brandAssets.meta`

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
