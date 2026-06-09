# AutoCore Web

Web-версия AutoCore на Next.js + Firebase.  
Текущий этап: foundation + auth/onboarding + MVP бухгалтерии + web-версия модуля моторов (AG Grid).

## Запуск

1. Установите зависимости:

```bash
npm install
```

2. Создайте `.env.local` из примера:

```bash
cp .env.local.example .env.local
```

3. Заполните Firebase web credentials в `.env.local`:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

4. Запустите проект:

```bash
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000).

## Что уже реализовано

- App Router shell с секциями: бухгалтерия, моторы, проданные, склад, настройки
- **Branding (независимая копия в `assets/`):**
  - Web использует только `autocore-web/assets/` — без путей к iOS/macOS
  - Native: `AutoCore/Assets.xcassets/` (AppIcon, LoginLogo) — отдельно
  - При обновлении бренда: правьте оба набора или `npm run assets:sync-from-native`
  - `assets/icons/app-icon.png`, `app-icon-dark.png`
  - `assets/branding/login-logo-transparent.png`
  - `assets/meta/favicon.png`
  - `src/app/loading.tsx` с брендированной загрузкой
- Firebase Auth: Google + email/password
- User profile bootstrap в `users/{uid}`
- Guard для пустого `.env.local` (приложение не падает, показывает экран настройки)
- Company onboarding:
  - создание `companies/{companyId}`
  - join по callable функции `joinCompanyWithInvite`
- Accounting MVP:
  - realtime подписка на `financialOperations`
  - вкладки: Обзор, Касса, Расходы, Операции, Авансы
  - добавление новой операции
  - удаление операции
  - read-only режим для роли `viewer`
- Motors MVP:
  - AG Grid таблица (inline edit)
  - realtime подписка на `users/{uid}/motors`
  - создание мотора
  - продажа/возврат с созданием финансовой операции
  - отдельная страница `sold`
- Warehouse MVP:
  - realtime список `inventoryItems`
  - добавление позиции и +1 к количеству
- Settings MVP:
  - профиль пользователя
  - обновление `companies/{companyId}.name`

## Структура

```txt
src/
  app/
    (auth)/login
    (dashboard)/accounting
  domain/
  application/use-cases/
  infrastructure/firebase/
  infrastructure/firestore/
  components/motors/
  components/
  hooks/
```

## Firebase и существующий backend

Этот веб-клиент рассчитан на тот же Firebase-проект, что и macOS/iOS AutoCore:

- Firestore rules: `../firebase/firestore.rules`
- Cloud Functions: `../firebase/functions/index.js`

Если вы меняете rules/functions, деплой выполняется из корня репозитория AutoCore:

```bash
firebase deploy
```

## Скрипты

```bash
npm run dev
npm run lint
npm run build
```

## Домены и SEO

Production split (рекомендуется):

| Домен | Назначение | Примеры URL |
|-------|------------|-------------|
| `myautocore.com` | Marketing, индексируется Google | `/`, `/product`, `/pricing` |
| `app.myautocore.com` | Приложение, не индексируется | `/login`, `/warehouse` |

Переменные Vercel:

```bash
NEXT_PUBLIC_MARKETING_URL=https://myautocore.com
NEXT_PUBLIC_APP_URL=https://app.myautocore.com
```

SEO marketing: `src/lib/seo/` — metadata, JSON-LD, sitemap, robots. Позиционирование: **программа для авторазборок и автосервисов**.

## Деплой на Vercel

1. Подключите репозиторий в [vercel.com](https://vercel.com) (Framework: Next.js).
2. Скопируйте переменные из `.env.vercel.example` в **Project → Settings → Environment Variables**.
3. Обязательно на Vercel:
   - `FIREBASE_SERVICE_ACCOUNT_JSON` — JSON сервисного аккаунта одной строкой (не путь к файлу).
   - `NEXT_PUBLIC_MARKETING_URL=https://myautocore.com`
   - `NEXT_PUBLIC_APP_URL=https://app.myautocore.com`
4. **Vercel → Domains** — добавьте оба домена к одному проекту.
5. **Firebase Console → Authentication → Authorized domains** — `app.myautocore.com`, `myautocore.com`.
6. **Apple Developer → Services ID** — Return URL `https://app.myautocore.com/login`.
7. Локально проверьте сборку: `npm run build` (должна проходить без ошибок).

`vercel.json` уже настроен: регион `fra1`, таймаут PDF/API 60s.
