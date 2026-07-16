# SEO operations — Google + Yandex

## Domains

| Host | Role | Indexing |
|------|------|----------|
| `https://myautocore.com` | Marketing | Index |
| `https://www.myautocore.com` | Redirect → apex | No |
| `https://app.myautocore.com` | Product app | `noindex` |

## Environment (Vercel → Marketing project)

```bash
NEXT_PUBLIC_MARKETING_URL=https://myautocore.com
NEXT_PUBLIC_APP_URL=https://app.myautocore.com
NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=...   # Google Search Console meta content
NEXT_PUBLIC_YANDEX_VERIFICATION=...        # Yandex Webmaster meta content
NEXT_PUBLIC_YANDEX_METRIKA_ID=...          # counter number, e.g. 12345678
# Optional HTML-file verification (rewritten from /yandex_*.html):
# YANDEX_WEBMASTER_VERIFICATION_PATH=yandex_xxxxxxxxxxxx.html
# YANDEX_WEBMASTER_VERIFICATION_BODY=<paste exact HTML from Webmaster>
```

Prefer **meta tag** verification (`NEXT_PUBLIC_YANDEX_VERIFICATION`). HTML file is optional for teams that already use that method in Webmaster.

## Submit once

1. **Google Search Console** — property `https://myautocore.com`, verify, submit `https://myautocore.com/sitemap.xml`
2. **Yandex Webmaster** — add site, verify, submit sitemap, set region (Kazakhstan / Russia as applicable), enable indexing of main mirrors only (apex)
3. **Yandex Metrika** — create counter, paste ID into env, check hits on `/`

## Technical surfaces

| URL | Purpose |
|-----|---------|
| `/sitemap.xml` | All marketing URLs + `ru-RU` alternates |
| `/robots.txt` | Allow marketing; disallow app paths; Host apex; Yandex UA rule |
| `/opengraph-image` | 1200×630 share image |
| `/manifest.webmanifest` | PWA / brand |
| `/yandex_*.html` | Optional Webmaster HTML verify (env-backed rewrite) |

## Content rules

- One H1 per page (already enforced in experience pages)
- FAQ JSON-LD only where FAQ is visible (home, pricing, download)
- No em-dashes in titles/descriptions/OG
- Primary commercial queries in RU: авторазборка, автосервис, склад запчастей, заказ-наряды, учёт двигателей

## Monthly checks

- [ ] GSC coverage / Yandex indexing errors
- [ ] Top queries vs titles (CTR)
- [ ] Soft 404 / redirect chains after releases
- [ ] Metrika goals: demo click, download click, contact submit
