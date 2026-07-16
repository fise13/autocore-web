# E2E smoke (manual + future Playwright)

Until Playwright is installed, run this checklist after marketing/dashboard releases.

## Marketing

1. Open marketing host `/` — hero shows **AutoCore** brand, CTAs **Попробовать демо** + **Скачать**.
2. Click demo CTA → lands on app demo/login.
3. `/product`, `/modules`, `/pricing`, `/security`, `/contact`, `/download` render without console errors.
4. Toggle system dark mode — no inverted mid-page sections; muted text remains readable.

## Auth → Mission Control → Motors

1. Login with a test account on app host.
2. Land on Mission Control (`/`).
3. Navigate to `/motors` — list or empty state visible.
4. Navigate to `/warehouse` and back to `/motors` — second visit feels cached (no full blank flash).
5. Open command palette — focus ring visible; Escape closes.

## Reduced motion

1. Enable OS “Reduce motion”.
2. Marketing page transitions and scroll reveals stay static or instant.
3. Auth floating paths do not loop.

## Automating later

```bash
npx playwright install
# Add tests under e2e/ covering login → Mission Control → motors
```
