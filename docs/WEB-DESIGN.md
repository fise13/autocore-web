# AutoCore Web Design System

Source of truth for marketing + dashboard visual language.

## Brand

| Token | Value |
|-------|--------|
| Name | AutoCore |
| Tagline | Операционная система для авторазборок и автосервисов |
| Primary (light) | `#0a73f2` |
| Primary (dark) | `#4d96ff` |
| Background (light) | `#f5f7fb` |
| Background (dark) | `#0d0e12` |
| Foreground (light) | `#11131a` |
| Muted foreground (light) | `#5a606c` (WCAG AA on canvas) |
| Fonts | Geist Sans, Geist Mono (`next/font`) |
| Icon library | Lucide (shadcn project standard) |

Defined in `src/app/globals.css`. Do not introduce a second accent family (no violet theme accents on marketing).

## Shape

| Context | Radius |
|---------|--------|
| Global `--radius` | `0.625rem` |
| Marketing experience `--exp-radius` | `0.75rem` |
| Pills (tabs, badges) | `rounded-full` only for interactive chips |
| Cards / mocks | `rounded-xl` / token scale |

## CTA intent lock

One label per intent across nav, hero, CTA, pricing, contact:

| Intent | Label |
|--------|--------|
| Demo / trial | Попробовать демо |
| Sign in | Войти |
| Download | Скачать |
| Contact | Связаться |

## Marketing dials

- `DESIGN_VARIANCE`: 7
- `MOTION_INTENSITY`: 6
- `VISUAL_DENSITY`: 4

Motion must be motivated and honor `prefers-reduced-motion`. Prefer `motion/react` for UI motion; GSAP/ScrollTrigger only for pin/scrub. Do not reintroduce Lenis unless scroll UX is revalidated.

## Copy rules

- No em-dashes (`—`) or separator en-dashes (`–`) in user-facing copy
- Live home copy: `src/components/marketing/experience/content/landing-content.ts`
- Subpages: `src/components/marketing/content/marketing-site-content.ts`
- SEO: `src/lib/seo/marketing-seo.ts` (tagline must stay aligned)

## Component stack

- shadcn `base-nova` + Base UI primitives
- Semantic tokens (`bg-primary`, `text-muted-foreground`) in product UI
- Forms: prefer `Field` / `FieldGroup` for new work
- Overlays always include accessible titles

## Page overrides

| Surface | Notes |
|---------|--------|
| Marketing | Experience CSS in `src/styles/marketing-experience.css`; host `myautocore.com` |
| Dashboard | Dense ops UI; shell in `src/components/layout/dashboard-shell.tsx`; host `app.myautocore.com` |
| Auth | Journey shell; CTAs follow intent lock above |

## SEO

Ops checklist and Yandex/Google setup: [`docs/SEO.md`](./SEO.md). Audit notes: [`docs/SEO-AUDIT.md`](./SEO-AUDIT.md).
