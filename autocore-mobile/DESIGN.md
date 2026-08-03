# Autocore Mobile Design Language v3

Premium B2B operational software: content-first, typography-led, native iOS feel.
References (philosophy only — never pixel-copy): Notion Mobile, Claude Mobile, Apple HIG, Linear Mobile.

## Principles

1. **Clarity over decoration** — no ornamental glass, gradients, or multi-shadow stacks in product UI.
2. **Hierarchy over borders** — group with inset sections and type weight; borders are hairlines or absent.
3. **Whitespace over density** — prefer breathing room; tighten only when information density demands it.
4. **Motion over visual effects** — springs communicate state; no abrupt opacity flashes; no linear UI easing.
5. **Typography over color** — structure pages with type scale first; Autocore red is accent only.
6. **Content-first** — chrome yields to data and actions.
7. **Native iOS feeling** — HIG touch targets, platform push, sheets with detents, Dynamic Type once.
8. **Premium B2B** — quiet Autocore red primary; workshop domain content stays distinctive.

## Auth vs product

- **Auth** may use a cinematic brand intro (splash → settle).
- **Product** (post sign-in) uses the quieter operational language below.

## Source of truth

| Domain | Canonical |
| --- | --- |
| Space / radius / control / elevation / motion | `theme/tokens.ts` |
| Typography | `theme/typography.ts` (HIG semantic + `metric` / `sectionLabel`) |
| Colors | `@autocore/design-tokens` via `theme/colors.ts` |

`rhythm` in `theme/screen.ts` is a **thin alias** of `tokens.space` / `tokens.radius` — do not invent new values there.
Feature `layout.ts` / `wo-visual` may keep **domain ink** only (status colors, Mail row geometry). No private type or spacing scales.

## Tokens

| Domain | Values |
| --- | --- |
| Radius | control **10** · group **12** · sheet **16** · modal **20** · full |
| Space | screenX **16** · section **24** · stack **12** · inline **8** · micro **4** |
| Touch | every control ≥ **44×44** (visual may be smaller with hitSlop) |
| Elevation | `none` · `floating` · `modal` — cards use **fill or hairline, never both + shadow** |
| Motion | five springs only: `press` · `settle` · `sheet` · `list` · `nav` (critically damped) |

## Typography

Quiet Claude/Notion sans (SF Pro / system). Optical tracking slightly negative on display sizes.

**Semantic only:** `largeTitle`, `title1`–`title3`, `headline`, `body`, `callout`, `subheadline`, `footnote`, `caption1`, `caption2`, `metric`, `sectionLabel`.

Legacy aliases (`pageTitle`, `heading`, `caption`, `label`, …) resolve to the semantic set and must not introduce new sizes. **No uppercase stamps** — `sectionLabel` is sentence case medium.

**Dynamic Type:** `Text` does not double-scale; `maxFontSizeMultiplier` caps growth.

## Icons

Stroke **1.5**. Settings rows ~20pt muted outline; quieter chevrons. No colored glyph wells.

## Motion

| Spring | Use |
| --- | --- |
| `press` | Control press scale |
| `settle` | Menus, overlays settle |
| `sheet` | Sheet present / dismiss |
| `list` | True insert / delete layout only |
| `nav` | Screen-level transitions |

**Lists:** press = short `withTiming` fill/opacity. Do **not** attach `FadeInDown` / `LinearTransition` to every row.
**Switches / segments:** timing (cubic out), never spring overshoot.
**Reduced motion:** `useMotion()` — shorten or disable travel.

## Surfaces

| Variant | Use |
| --- | --- |
| `plain` | Page background |
| `grouped` | Inset section (settings-style island) |
| `inset` | Grouped + horizontal screen inset |
| `elevated` | Floating / modal only |

Prefer `ListSection` + `CollectionRow` over bordered card grids for directories.

## List dialects

1. **Collection (default)** — Notion-style inset islands, icon-inset hairlines, quiet press, selection, swipe.
2. **Orders listing cards** — Airbnb-like soft hero + bold title / muted meta / underlined price; opens detail as an **iOS page sheet** (stacked card, Apple slide-up). iOS keeps SwiftUI swipe / context menu / Edit selection. Same `tokens.space` / type.

Insert/delete may use `tokens.motion.springs.list`. Reorder is opt-in later.

## Sheets

Use `Sheet` with detents: `compact` · `medium` · `large` · `full`.
Interactive drag, spring dismissal (`sheet` spring), backdrop fade. **Do not** fork Gorhom configs per feature — migrate raw `BottomSheetModal` call sites to `Sheet`.

## Buttons

- **Form / sheets:** `Button` with `native={false}` — Claude-static RN fill, soft radius, no liquid glass.
- **Toolbar:** `IconButton` + `systemImage` · `ghost` · plain SF only.
- Never `glass` / `glassProminent` in product UI.

## Loading & empty

- First paint → **structure-preserving skeletons** (match Collection / Mail row geometry).
- Spinners only for short local actions.
- Empty = type-led, no dashed ornamental cards.

## States

Every interactive primitive: empty, loading, error, success, offline, disabled, pressed, focused, selected.

## Route categories

| Category | Chrome | Transition |
| --- | --- | --- |
| Tab root | Large title when possible | Crossfade |
| Drill-in | Native stack | Platform push + back gesture |
| Modal task | `Sheet` | Present up, interactive dismiss |
| Immersive (scan) | Custom | Fade / hold |

## Do / Don’t

**Do**

- Import from `@/theme` → `tokens` / `typography` / `useMotion`
- Use `ContentState` for async gates
- Keep Autocore red as brand accent

**Don’t**

- Parallel spacing/radius ladders in features
- Local typography maps (`woType`, uppercase overlines)
- Opacity-only enter/exit flashes; linear UI easing
- Sub-44pt pressables without hitSlop
- New card variants — compose `Surface` / `ListSection`

## Living gallery

DEV: `app/design-system.tsx` — acceptance surface for v3 variants, states, type, sheets, lists, motion.

## Safe area

`StickyActionBar` pads `insets.bottom + gap`. Sheets use modal safe insets from the sheet hook.

## Device smoke checklist (verify)

- [ ] **Dynamic Type** — Settings + Orders rows reflow; no clipped labels at largest sizes.
- [ ] **44pt targets** — Collection rows, toolbar icons, StickyActionBar CTAs.
- [ ] **Reduced Motion** — Settings press fills stay timing-only; Sheet / Menu travel collapses via `useMotion()`.
- [ ] **Light / dark** — Collection islands, EmptyState, StickyActionBar hairline.
- [ ] **Gallery** — DEV `app/design-system.tsx` covers type, surfaces, Collection, skeletons, empty, StickyActionBar.
- [ ] **Proof path** — Company settings Collection + Switch organization `Sheet`.
