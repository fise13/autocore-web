# Autocore Mobile Design Language v3

Premium B2B operational software: content-first, typography-led, native iOS feel.
References (philosophy only — never pixel-copy): Notion Mobile, Claude Mobile, Apple HIG, Linear Mobile.

## Principles

1. **Clarity over decoration** — no ornamental glass, gradients, or multi-shadow stacks in product UI.
2. **Hierarchy over borders** — group with inset sections and type weight; borders are hairlines or absent.
3. **Whitespace over density** — prefer breathing room; tighten only when information density demands it.
4. **Motion over visual effects** — springs communicate state; no abrupt opacity flashes; no linear UI easing.
5. **Typography over color** — structure pages with type scale first; Autocore blue (`#0a73f2` / dark `#4d96ff`) is the locked accent from `@autocore/design-tokens`.
6. **Content-first** — chrome yields to data and actions.
7. **Native iOS feeling** — HIG touch targets, platform push, sheets with detents, Dynamic Type once.
8. **Premium B2B** — quiet Autocore blue primary; workshop domain content stays distinctive.
9. **Shell dock** — liquid glass stadium **Home · Work · (+) · Finance · Settings** via real `UIGlassEffect` (`expo-glass-effect`). Modules never add dock tabs.
10. **Dynamic Island** — real iOS Live Activities via `expo-widgets` (offline / intake sync). No in-app status pill.

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
| Radius | control **10** · group **12** · sheet **16** · modal **20** · dock **24** (stadium) · full |
| Space | screenX **20** · section **32** · stack **12** · inline **8** · micro **4** |
| Touch | every control ≥ **44×44** (visual may be smaller with hitSlop) |
| Elevation | `none` · `floating` · `modal` — cards use **fill or hairline, never both + shadow** |
| Motion | five springs only: `press` · `settle` · `sheet` · `list` · `nav` (critically damped) |
| Tones | success · warning · danger · **ai** (calm teal) · **offline** |

## Typography

Quiet Claude/Notion sans (SF Pro / system). Optical tracking slightly negative on display sizes.

**Semantic only:** `largeTitle`, `title1`–`title3`, `headline`, `body`, `callout`, `subheadline`, `footnote`, `caption1`, `caption2`, `metric`, `sectionLabel`, `identifier` (mono serials/VINs).

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

## Home (Mission Control)

Home is a calm operational command surface — revenue first, then tiles, actions, AI, recent.
Philosophy: premium dark B2B dashboards (clear hierarchy, soft squircle cards) + Stripe-grade ops metrics.
Accent stays Autocore blue from `@autocore/design-tokens` (mock red is reference-only).

Canonical composition (`features/overview/` · `Mc*` components):

1. Header — time-of-day greeting · **company name** · notification bell
2. Attention strip (only when items exist)
3. Revenue hero card (value · growth pill · week bars; latest bar brightest)
4. Two stat tiles (orders · stock)
5. Quick actions (Add part · Scan · Inventory · AI) — circular icon wells
6. AI insights card (primary border, solid accent glyph well)
7. Recent activity feed

Rules:

- Create verbs still open via dock **+** / New sheet; Home quick actions are shortcuts only
- Cards: soft fill + large radius (`tokens.radius.modal`); no shadow stacks
- Section labels use `sectionLabel` (sentence case — never uppercase stamps)
- Hide Attention / AI when empty
- Home summarizes; **Work** executes

Home layout: `features/overview/layout.ts` → `mc.pad` 20 · `mc.section` 32 · `mc.cardRadius` 20.

## Floating dock

`LiquidGlassTabBar` (`components/navigation/liquid-glass-tab-bar.tsx`) → Swift `UIGlassEffect` / `UIGlassContainerEffect` via `expo-glass-effect`.

```text
RN tabs → LiquidGlassTabBar → GlassContainer
                              └─ GlassView (Home · Work · + · Finance · Settings)
```

One continuous `UIGlassEffect` stadium — left and right share the same glass surface. Center (+) is a solid white orb inside the bar for contrast. Pre-iOS 26 / Android falls back to the dense dark stadium fill.

| Token | Value |
| --- | --- |
| Pill | **356** × **64**, radius **32** |
| Center action | **60** solid white orb inside the glass bar · **+** 28 stroke **2.5** |
| Icons | **22** · Settings outline only |
| Labels | **12** / **500** · active **600** · inactive opacity **0.55** |
| Side margin | **18.5** |
| Bottom | safe-area inset **+ 8** |

Gate: `isLiquidGlassAvailable()` ∧ `isGlassEffectAPIAvailable()`. Never set parent opacity to `0` on glass views.

## Dynamic Island (iOS Live Activities)

Real system Dynamic Island + Lock Screen via `expo-widgets` (`features/live-activity/`).

**Shows only when there is actionable intake information** — never an empty “Offline” island.
**Layout lives in the widget extension** — after changing `operations-live-activity.tsx`, run a native rebuild (`npm run ios:release`). Soft reload will not update the Lock Screen chrome. The `'widget'` function must be self-contained (no helpers outside it) — Babel serializes only that function into the App Group; outer helpers → blank black Island.

| Priority | Condition | Behavior |
| --- | --- | --- |
| 1 | `failedCount > 0` (no pending) | “Sync failed” · count · tap → `autocoremobile://intake` |
| 2 | `pendingCount > 0` + offline | “Waiting offline” · queued · indeterminate ProgressView |
| 3 | `pendingCount > 0` + online | “Syncing photos” · `done/total` · linear ProgressView |
| 4 | Empty outbox (even if offline) | Activity ended immediately |

Apple-like chrome (`apple-v5`): compact = framed app icon + monospaced count; expanded = 36pt icon · title/subtitle · metric · ProgressView; Lock Screen banner matches. App icon **must** use `resizable` + `frame` — bare `uiImage` stretches into a gray bar in the compact slot. Failed mode shows the failed count alone (not `0/N`).

Policy: `resolveDesiredLiveActivity`. Host mounts once under `(tabs)`. On launch we clear any stale ActivityKit instances so blank black pills cannot linger.

**Presentation is enabled** (`LIVE_ACTIVITY_PRESENTATION_ENABLED = true` in `use-operations-live-activity.ts`). Progress is **photo-only** (ignores heartbeats / failed leftovers). Compact leading uses the AutoCore app icon from App Group (`ensure-live-activity-icon.ts`). After changing the ActivityKit layout, rebuild on device (`npm run ios:release`) — soft reload will not update Island chrome.

**Blank black Island:** the `'widget'` function must be fully self-contained — Babel only serializes that function into the App Group. Helpers defined outside the widget function are undefined at render time and produce EmptyView (black pill).

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
- Keep Autocore blue as brand accent (dock chrome stays monochrome)

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
