# SEO Audit — AutoCore (Google + Yandex)

Date: 2026-07-16  
Scope: marketing host `myautocore.com` (+ app host noindex)

## Verdict

Foundation is strong (canonicals, OG, sitemap, Host, JSON-LD, split hosts). Gaps that hurt Yandex/Google: **FAQ schema without visible FAQ on home**, incomplete `robots` disallow, weak Yandex Metrika/geo signals, Cyrillic font subset, em-dashes in OG/manifest, duplicate WebPage JSON-LD on modules, SoftApplication trial offer priced at `0` vs real `$15`.

## Scorecard

| Area | Before | Target |
|------|--------|--------|
| Titles / descriptions | Good RU keywords | Stronger Yandex long-tails, SERP length |
| Canonical / hreflang | OK (`ru-RU`, `x-default`) | Keep |
| robots.txt | Partial app disallow | Full app surface blocked |
| sitemap.xml | All marketing URLs | Keep + explicit mobile download |
| JSON-LD | Rich | Fix FAQ visibility, Offer, Org geo/KZ |
| Verification | Env hooks only | Env + Metrika + docs |
| Analytics | None on marketing | Yandex Metrika (opt-in) |
| Rendering | Geist `latin` only | + `cyrillic` |
| www / http | 301 in middleware + vercel | Keep |

## Implemented in this pass

See `docs/SEO.md` for ops checklist (Webmaster, Metrika, env vars).
