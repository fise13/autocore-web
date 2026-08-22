# AutoCore Design Language

**Version:** v1  
**Surface:** AutoCore Mobile (`autocore-mobile/`) — primary; shared color SSOT with web via `@autocore/design-tokens`  
**Status:** Single source of truth for subsequent UI/UX implementation  
**Mode:** Audit-backed specification — do **not** treat older feature-local layout forks as authority  

**Related documents (do not fork conflicting rules):**

| Document | Role |
| --- | --- |
| [`packages/design-tokens/src/colors.ts`](../packages/design-tokens/src/colors.ts) | Canonical colors (all clients) |
| [`autocore-mobile/theme/tokens.ts`](../autocore-mobile/theme/tokens.ts) | Space, radius, control, motion |
| [`autocore-mobile/theme/typography.ts`](../autocore-mobile/theme/typography.ts) | Type scale |
| [`autocore-mobile/DESIGN.md`](../autocore-mobile/DESIGN.md) | Prior mobile DL v3 notes — **superseded where this doc conflicts** |
| [`docs/MOBILE-UX-AUDIT.md`](./MOBILE-UX-AUDIT.md) | Historical trust/IA audit (July 2026) — still useful for trust gaps; routes partially stale |
| [`docs/WEB-DESIGN.md`](./WEB-DESIGN.md) | Web/marketing — do not copy Geist/web chrome into mobile |

This document is grounded in the **current codebase** (theme, navigation, screens, components). Target guidance that changes existing patterns is labeled **Target** and listed in **Existing → Target**.

---

## 1. Design principles

### 1.1 Calm information density

**What:** Show more operational signal per viewport than a consumer lifestyle app, without visual panic. Prefer one well-ordered scroll of grouped content over a grid of competing widgets.

**Why:** AutoCore users run warehouses, engines, work orders, and money. They need Stripe-like density and Apple Health–like calm. Noise burns trust faster than missing chrome.

**In practice:** Finance-style narrative sections and Work grouped lists beat Home’s current stack of soft squircle cards when density rises.

### 1.2 Clear hierarchy

**What:** Structure every screen with typography and surface steps first: large title → section → row → meta. Color and icons are secondary.

**Why:** Hierarchy is how professionals scan. If everything is “emphasized,” nothing is.

**In practice:** Use `typography.largeTitle` / `title1`–`title3` / `sectionLabel` / `body` / `caption1`. Do not invent feature-local type ladders (`finType.hero` 46, Work private scales).

### 1.3 Progressive disclosure

**What:** Summary → detail → action. Hide empty optional blocks. Push rare controls into sheets and drill-ins.

**Why:** Apple Health Summary works because it does not dump every metric at once. AutoCore’s job surfaces (Work, Engines, Finance) already do this better than Home.

**In practice:** Home Attention / insight blocks appear only when content exists. Charts start quiet; scrub reveals values.

### 1.4 Data before decoration

**What:** Every visual element must answer a business question or enable an action. No ornamental glass, gradient washes, or multi-shadow stacks in product UI.

**Why:** Decoration read as costume when controls are wrong or metrics are static. Craft = truthful data + reliable actions.

### 1.5 Action follows information

**What:** Present context, then the obvious next step. Primary CTAs sit after the content they act on (or in a sticky bar when committing a flow).

**Why:** Oversized hero buttons without context train “tap and hope.” Operational software earns taps with clarity.

### 1.6 Native iOS feel (Android respects platform)

**What:** Prefer platform navigation, sheets with detents, SF Symbols on iOS, HIG touch targets, Dynamic Type with caps, liquid glass dock only where the OS supports it.

**Why:** AutoCore Mobile is not a web viewport in a shell. Users judge quality against Apple Health / system Settings, not against generic SaaS admin.

**Android:** Same information architecture and tokens; opaque dock fallback; Material-adjacent elevation only where elevation tokens allow; never fake iOS glass.

### 1.7 Semantic color

**What:** Meaning travels through named tokens (`success`, `warning`, `danger`, `ai`, `offline`, `primary`), never through ad-hoc hex. Status always pairs color with text or icon.

**Why:** Shared package enforces contrast (`npm run tokens:check`). Parallel palettes (e.g. Work OS `#635BFF`) break brand and a11y contracts.

### 1.8 Consistent interaction patterns

**What:** One way to press, sheet, filter, search, and navigate. Five motion springs only. One dock. One New/Action sheet entry.

**Why:** Parallel patterns (raw Gorhom vs `Sheet`, private radii, duplicate create entry points) make the app feel unfinished.

### 1.9 Reusable components

**What:** Compose `Surface`, `ListSection` / `CollectionRow`, `Button`, `Sheet`, chart primitives — do not invent one-off “cards” per feature.

**Why:** Scalability. New Home / Finance / Work screens must inherit the language, not fork it.

### 1.10 Business context over generic dashboard UI

**What:** Screens speak workshop operations: engines, locations, work orders, cash, intake — not “KPI tiles for SaaS.”

**Why:** Generic dashboards are interchangeable. AutoCore wins when the UI feels like the business, with Health-grade IA and Stripe-grade ops literacy.

---

## 2. Product visual direction

### Target synthesis

| Reference | Extract (do not copy) | AutoCore adaptation |
| --- | --- | --- |
| **Apple Health** | Summary IA, grouped sections, progressive disclosure, quiet charts, calm cards | Dynamic Business Summary on Home; grouped lists; restrained chart language |
| **Stripe Dashboard** | Metric literacy, drill-down, period switching, operational narrative | Finance narrative + Home metrics that earn their place; dense but labeled |
| **Linear Mobile** | Professional density, nav clarity, type hierarchy, quiet dark UI | Dock discipline, filters/search, dark surfaces via token elevation |

AutoCore must remain **AutoCore**: Autocore blue accent, workshop domain content, liquid-glass floating dock, Live Activities for intake — not a Health/Stripe/Linear clone.

### Overall visual character

Quiet operational product. Typography-led. Soft grouped surfaces on a cool gray canvas (`background` `#f5f7fb` light / `#0d0e12` dark). Accent used sparingly for primary actions, links, and chart series — not for decoration.

### Density

- **Target:** Medium-high (Linear + Stripe), with Health-like section breathing (`section` 32).
- **Current:** Uneven — Settings/Work/Engines denser and clearer; Home looser and card-heavy.

### Contrast

- Prefer surface steps (`background` → `card` → `surfaceElevated`) over borders and shadows.
- Dark UI: elevate with fill (`surfaceElevated` `#22242e`), not drop shadows everywhere.

### Surface hierarchy

1. `background` — page canvas  
2. `card` / `surface` — grouped islands, list containers  
3. `surfaceElevated` — sheets, floating layers, rare elevated panels  
4. Dock / overlays — system chrome (glass or dense stadium)

### Visual noise

Keep low. Ban: decorative gradients in product chrome, colored icon wells as default, badge stacks, competing hero CTAs, uppercase section stamps.

### Borders

Hairlines only (`tokens.control.hairline`: iOS 0.33 / Android 1). Prefer separators inside grouped lists over boxing every row.

### Cards

Allowed when they are **typed containers** for interaction or a single metric/trend story. Prefer **grouped lists** for directories of homogeneous items. See §4 Cards.

### Icons

SF Symbols (iOS) / consistent stroke **1.5** (`theme/icons.ts`). Muted outline in lists (~20pt). No rainbow glyph wells. Dock icons 22pt; Settings tab outline-only (`gearshape`).

### Color

Locked Autocore blue from design-tokens (`#0a73f2` / dark `#4d96ff`). Semantic tones for status. Appearance accent overrides exist (`theme/accent.ts`) but default remains brand blue.

### Typography

System SF / Android sans. HIG semantic scale in `theme/typography.ts`. Tabular metrics. Sentence-case `sectionLabel` — never uppercase stamps.

### Avoid

- Generic SaaS dashboard grids (2×2 KPI wallpaper)
- Excessive floating cards / card-in-card
- Decorative gradients and multi-layer shadows
- Unnecessary icons next to every label
- Huge CTA buttons that dominate Summary
- Excessive blue accents (blue is primary action + series, not wallpaper)
- Arbitrary rounded containers (private `radius: 8` / `cardRadius: 20` literals outside tokens)
- Duplicate navigation (Quick Actions that merely repeat dock destinations without shortcut value)
- Metrics without context (number with no period, unit, or trend)
- Treating the dock **+** as a generic single-entity “Add”
- Parallel color/type/spacing systems in `features/*/layout.ts`

---

## 3. Design tokens

### Canonical sources (do not invent a second ladder)

| Domain | File |
| --- | --- |
| Colors | `packages/design-tokens/src/colors.ts` → mobile `theme/colors.ts` |
| Space / radius / control / opacity / motion | `autocore-mobile/theme/tokens.ts` |
| Spacing ladder | `autocore-mobile/theme/spacing.ts` |
| Typography | `autocore-mobile/theme/typography.ts` |
| Elevation | `autocore-mobile/theme/elevation.ts` |
| Shadows | `autocore-mobile/theme/shadow.ts` |
| Icons | `autocore-mobile/theme/icons.ts` |
| Haptics | `autocore-mobile/theme/haptics.ts` |
| Dock metrics | `autocore-mobile/lib/navigation/floating-tab-bar-inset.ts` |

`theme/screen.ts` `rhythm` is a thin alias of `tokens.space` / `tokens.radius` — do not add values there.

NativeWind / Tailwind is configured but **product TSX does not use `className`**. Do not introduce a parallel utility styling path for new UI.

---

### 3.1 Color system

Preserve the existing semantic palette. It already matches Autocore brand and WCAG contracts. Map “design language names” → token names below.

#### Background

| | |
| --- | --- |
| **Tokens** | `background` — light `#f5f7fb` · dark `#0d0e12` |
| **Purpose** | Page canvas behind grouped content |
| **Usage** | Screen roots, `Surface` `plain` |
| **Contrast** | Body text (`foreground`) must meet AA on background |
| **Examples** | Home / Work / Settings scroll canvas |

#### Grouped surface

| | |
| --- | --- |
| **Tokens** | `card` / `surface` — light `#ffffff` · dark `#1a1c24` |
| **Purpose** | Inset islands (Health/Settings-style groups) |
| **Usage** | `Surface` `grouped`/`inset`, `ListSection`, metric containers |
| **Contrast** | `cardForeground` / `textPrimary` on card |
| **Examples** | Settings sections, Work groups, Finance blocks |

#### Elevated surface

| | |
| --- | --- |
| **Tokens** | `surfaceElevated` — light `#ffffff` · dark `#22242e` |
| **Purpose** | One step above card for sheets / floating layers |
| **Usage** | `Surface` `elevated`, modal content, rare floating panels |
| **Contrast** | Same foreground family; prefer fill step over shadow in dark |
| **Examples** | Modal tasks, elevated popovers |

#### Separator / border

| | |
| --- | --- |
| **Tokens** | `border` · `borderMuted` · `input` |
| **Purpose** | Hairline structure, not boxes |
| **Usage** | List row dividers, grouped island outline (optional), inputs |
| **Contrast** | Low-contrast by design; never sole status indicator |
| **Examples** | `CollectionRow` inset separators |

#### Primary text

| | |
| --- | --- |
| **Tokens** | `foreground` / `textPrimary` / `cardForeground` — light `#11131a` · dark `#f5f5f7` |
| **Purpose** | Titles, primary values, row titles |
| **Usage** | Default `Text` color |
| **Contrast** | AA vs background and card (enforced in CI) |

#### Secondary text

| | |
| --- | --- |
| **Tokens** | `textSecondary` / `mutedForeground` — light `#5a606c` · dark `#a8acb8` |
| **Purpose** | Meta, supporting copy, inactive labels |
| **Usage** | Subtitles, timestamps, dock inactive (via opacity) |
| **Contrast** | AA muted contract in `contrastContract` |

#### Tertiary text

| | |
| --- | --- |
| **Tokens** | Prefer `mutedForeground` at caption sizes, or opacity on secondary — **do not add a new hex** |
| **Purpose** | Least emphasis (axis labels, legal, placeholders) |
| **Usage** | Chart axes, placeholder, hints |
| **Target adjustment** | If a dedicated tertiary is needed later, derive from muted — do not invent `#999` |

#### Primary accent

| | |
| --- | --- |
| **Tokens** | `primary` / `accent` — light `#0a73f2` · dark `#4d96ff` (+ Hover/Pressed/Subtle/OnSubtle/Border) |
| **Purpose** | Brand action, links, selected emphasis, default chart series (`chart1`) |
| **Usage** | Primary buttons, key interactive text, focus ring partner `ring` |
| **Contrast** | `primaryForeground` on fill; `primaryOnSubtle` on `primarySubtle` |
| **Keep** | Locked brand blue. Appearance overrides in `theme/accent.ts` are optional user chrome, not a second brand. |

#### Positive

| | |
| --- | --- |
| **Tokens** | `success` family — light `#26b34a` · dark `#40d168` |
| **Purpose** | Positive deltas, healthy state, completed |
| **Usage** | Growth pills, success toasts, available-when-text-backed |
| **Always** | Pair with label / icon — never color alone |

#### Warning

| | |
| --- | --- |
| **Tokens** | `warning` family — light `#f0a500` · dark `#ffc94d` |
| **Purpose** | Needs attention, degraded, approaching limit |
| **Usage** | Attention banners, caution badges |
| **Note** | `warningForeground` is dark ink on fill for AA |

#### Destructive

| | |
| --- | --- |
| **Tokens** | `destructive` / `danger` family — light `#eb3838` · dark `#ff6166` |
| **Purpose** | Delete, irreversible, failed sync |
| **Usage** | Destructive buttons, error states, Live Activity failed |

#### Informational

| | |
| --- | --- |
| **Tokens** | Prefer `primary` subtle family, or `ai` for AI-specific, `offline` for sync — **no separate “info blue” hex** |
| **Purpose** | Neutral system notices |
| **Usage** | Tips, sync messaging |

#### Disabled

| | |
| --- | --- |
| **Tokens** | `tokens.opacity.disabled` **0.45** on interactive content; muted surfaces for inert chrome |
| **Purpose** | Unavailable controls |
| **Usage** | Disabled `Button` / rows; keep hit target but block action |

#### Domain tones (keep)

| Tone | Role |
| --- | --- |
| `ai` | Calm teal for AI surfaces (`#0f766e` / dark `#2dd4bf`) — never neon |
| `offline` | Sync-degraded / offline |
| `chart1`–`chart5` | Series colors aligned to primary/success/warning |

#### Proposed corrections (only where code diverges)

| Issue | Action | Priority |
| --- | --- | --- |
| Work OS private palette (`features/work/design/tokens/colors.ts`, accent `#635BFF`) | **Deprecated** — migrate to design-tokens | High |
| Feature-hardcoded hex outside tokens | Replace with semantic tokens | High |
| Accent overrides inventing violet/emerald/etc. | Allowed only via Appearance settings path; never as feature defaults | Medium |

---

### 3.2 Typography

**Family:** iOS `System` (SF Pro) · Android `sans-serif` · mono `Menlo` / `monospace` for `identifier`.  
**Do not add Geist or other webfonts to mobile product UI** (Tailwind config names are unused legacy).

| DL role | Token / variant | Size | Weight | Line height | Tracking | Usage |
| --- | --- | --- | --- | --- | --- | --- |
| Large title | `largeTitle` | 34 | 700 | 41 | −0.45 | Tab roots, Home greeting title area |
| Title | `title1` / `title2` / `title3` | 28 / 22 / 20 | 700 / 600 / 600 | 34 / 28 / 25 | tight | Screen titles, hero names |
| Section title | `sectionLabel` | 13 | 500 | 18 | −0.08 | Group headers — **sentence case** |
| Metric | `metric` (`kpi` alias) | 28 | 600 | 34 | −0.28 | Tabular KPIs |
| Body | `body` / `headline` | 17 | 400 / 600 | 22 | −0.18 | Paragraphs / emphasized body |
| Secondary | `subheadline` / `callout` | 15 / 16 | 400 | 20 / 21 | normal/snug | Supporting copy |
| Caption | `caption1` / `caption2` / `footnote` | 12 / 11 / 13 | 400 | 16 / 13 / 18 | open/normal | Meta, chart notes |
| Button | `button` → `headline`; `buttonSmall` 15/600 | 17 / 15 | 600 | 22 / 20 | snug/normal | Button labels |
| Tab | Dock labels (code) | 12 | 500 → 600 focused | — | — | Bottom dock only |
| Navigation label | `headline` / `body` in nav bars | 17 | 600 | 22 | snug | Nav titles; back uses system |

**Identifier:** `identifier` 15 medium mono — serials, VINs, location codes.

**Dynamic Type:** `Text` uses system scaling with `maxFontSizeMultiplier` (default **1.35**). Do not manually multiply fontScale. Display numerals in Finance/Engines may use tighter caps already in those modules — prefer converging on the shared cap.

**Deprecated:** Feature ladders (`finType.hero` 46, `score` 56). Map hero metrics to `metric` or `title1` + tabular nums.

---

### 3.3 Spacing

**Existing scale** (`theme/spacing.ts`, 2px base) — **keep and reuse:**

`0, 2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32, 40, 48, 56, 64, 80, 96`

**Semantic layout** (`tokens.space`):

| Token | Value | Use |
| --- | --- | --- |
| `micro` | 4 | Icon–label tight gaps |
| `inline` | 8 | Inline control gaps |
| `stack` | 12 | Default vertical stack inside groups |
| `screenY` | 12 | Vertical screen padding rhythm |
| `screenX` | 20 | Horizontal screen margins |
| `section` | 32 | Between major sections |

**Documented application**

| Context | Value |
| --- | --- |
| Screen margins | `screenX` 20 (`screenPadding.horizontal`) |
| Section spacing | `section` 32 |
| Card / group padding | Prefer `stack`+4 (Surface default) or `spacing[4]` 16 — not arbitrary 18/22 |
| List row spacing | Collection dialect inset hairlines; row min height ≥ 44 |
| Icon gaps | `inline` 8 · tight `micro` 4 |
| Text gaps | `micro`–`stack` by hierarchy |
| Dock clear | `getFloatingTabBarOffset(safeBottom)` |

**Do not** create a second 4/8/12… ladder — this scale already includes it.

---

### 3.4 Radius

**Canonical (`tokens.radius`) — keep:**

| Token | Value | Use |
| --- | --- | --- |
| `none` | 0 | Flush edges |
| `control` / **small** | 10 | Inputs, small chips, compact controls |
| `group` / **medium** | 12 | Grouped surfaces, default cards |
| `sheet` / **large** | 16 | Sheets |
| `modal` | 20 | Modals; Home soft cards currently use this — **Target:** prefer `group` for list islands |
| `dock` | 32 | Floating dock stadium |
| `full` / **pill** | 9999 | Pills, circular orbs |
| **Button** | `control` (10) default; `pill` shape uses full | `Button` `shape` |

**Legacy aliases** in `theme/radius.ts` (`sm` 8, etc.) — prefer `tokens.radius`; do not introduce new aliases.

**Deprecated:** Feature literals (`eng.radius: 8`, Work `cardRadius: 20` as private constants). Map to `control` / `group` / `modal`.

---

### 3.5 Borders and separators

| Use | When |
| --- | --- |
| **Separator** | Between rows inside a grouped list; inset from leading icon/text edge |
| **Border (hairline)** | Optional outline on a single grouped island against background |
| **Neither** | When surface fill alone separates sections; between sections use whitespace (`section` 32) |

Health-style grouped UI: **economical separators**, not a grid of stroked cards.  
Rule from elevation: cards use **fill or hairline, never fill + hairline + shadow**.

---

### 3.6 Shadows and elevation

**Policy:** Shadows only for floating / modal layers.

| Level | Behavior |
| --- | --- |
| `none` | Grouped content — fill only |
| `floating` | Rare floating panels — `shadows.elevated` |
| `modal` | Modals / elevated sheets |

Dark UI: prefer `surfaceElevated` contrast over shadow.  
iOS: shadow props; Android: elevation in `getShadows`.  
**Avoid** shadow stacks on Home metric cards.

---

## 4. Component and interaction language

### Buttons

| Variant | Maps to code | Usage |
| --- | --- | --- |
| Primary | `Button` `default` | One primary commitment per region |
| Secondary | `secondary` / `outline` | Alternative actions |
| Destructive | `destructive` | Delete / irreversible |
| Text | `link` / `ghost` | Inline / toolbar text actions |
| Icon button | `IconButton` · sizes `icon*` | Toolbar; SF outline; hit ≥ 44 |
| Floating / global | Dock center **+** → Action sheet; `FloatingButton` only if no dock conflict | Global create menu — **not** a single-entity Add |

Sizes: `xs`–`xl` map to `tokens.control.height*`.  
`native` prop is **ignored** (always Pressable) — do not document glass SwiftUI buttons for product forms.  
Haptics: default on press via `theme/haptics`.

**Target:** Keep primary obvious but not oversized; avoid full-bleed giant CTAs on Summary.

---

### Lists

| Dialect | Purpose | Building blocks |
| --- | --- | --- |
| **Grouped list** | Settings / Work / directories | `ListSection` + `CollectionRow` / `Surface` inset |
| **Standard row** | Title + optional meta + chevron | `CollectionRow` |
| **Metric row** | Label left, tabular value right | Compose row + `typography.metric` or footnote value |
| **Navigation row** | Drills to detail | Chevron; must navigate (no fake chevrons) |
| **Activity row** | Recent event timeline | Home `McActivityFeed` pattern → converge on Collection |
| **Inventory / engine row** | Catalog identity | `EngineCatalogRow` / FlashList — dense, scannable |

**Orders listing cards** (existing DESIGN dialect): soft hero card for order browse is allowed; detail presents as page sheet. Prefer not to spread this dialect to Home Summary.

---

### Cards

Typed containers only:

| Type | Role | When |
| --- | --- | --- |
| **Metric card** | One KPI + period + delta | Summary / Finance — max few per viewport |
| **Trend card** | Metric + quiet chart | Trends section |
| **Insight card** | Short recommendation / AI insight | Only when content exists; use `ai` tone sparingly |
| **Attention card** | Urgent queue | Only when items exist |
| **Grouped surface** | Island wrapping a list | Default for homogeneous rows |

**Do not use a card when:**

- You are rendering a directory (use grouped list)
- You would nest cards inside cards
- The only purpose is decoration
- Multiple sibling cards repeat the same chrome without different jobs

**Current Home** (`McRevenueCard`, tiles, insight) is card-forward — **Target** migrate Summary toward Health-like grouped sections with fewer floating squircles.

---

### Search

| Aspect | Current / Target |
| --- | --- |
| Placement | Global `app/search.tsx`; feature overlays (e.g. `WorkSearchOverlay`); Engines list `SearchInput` |
| Height | Control heights — prefer `heightMd` 40 / `heightLg` 48; hit ≥ 44 |
| Radius | `tokens.radius.control` (10) |
| Placeholder | Domain-specific (“Search engines”) — sentence case |
| Icon | Leading magnifying glass, muted |
| Filtering | Combine with filter bar / chips below search when needed |
| Focus | `ring` / input border token; keyboard avoidance via screen chrome |
| Keyboard | Search keyboard; dismiss on scroll/navigate |

**Trust rule (from UX audit):** result rows with chevrons **must** navigate. Never decorative disclosure.

---

### Filters

| Pattern | Usage |
| --- | --- |
| **Segmented control** | 2–4 mutually exclusive modes (`segmented-control.tsx`) — period, scope |
| **Filter chips** | Multi facets (`chip.tsx`, `horizontal-filter-bar.tsx`) |
| **Filter sheets** | Complex / many options — `Sheet` detents |
| **Active state** | Primary subtle fill or emphasized label; clear count when multi |
| **Multi-select** | Chips + explicit Apply in sheets when costly |
| **Clear / reset** | Always offer Clear when any filter ≠ default |

Motion: segments use timing (cubic out), not spring overshoot.

---

### Navigation

#### Current architecture (code)

**Dock** — `LiquidGlassTabBar` + `TAB_SPECS`:

```text
Home · Work · (+) · Finance · Settings
```

| Slot | Route | Notes |
| --- | --- | --- |
| Home | `(tabs)/index` → `OverviewScreen` | Dynamic summary (**Target**) |
| Work | `(tabs)/work` | Execution catalog |
| **(+)** | `action` intercepted | Opens **New / Action sheet** — a11y “New” |
| Finance | `(tabs)/accounting` | Finance narrative |
| Settings | `(tabs)/profile` | Grouped settings |

Hidden tabs: `scan`, `ai` (AI workspace is a **parked stub** — large muted “#”, not docked).

**Authoritative dock metrics** (`floating-tab-bar-inset.ts`):

| Token | Value |
| --- | --- |
| Pill | 356 × 64, radius **32** |
| Center orb | **48** (hit 56), radius 24 |
| + glyph | 20pt, stroke **2.25** |
| Icons | 22 |
| Labels | 12 / 500 → 600 focused |
| Inactive opacity | 0.55 |
| Side inset | 18.5 |
| Bottom | safe area + 8 |

Liquid glass on eligible iOS; else dense stadium `DOCK_FILL`.

#### Center (+) — critical product rule

**As implemented today:** global **New / Action sheet** (`presentActionSheet` → `ActionSheetHost`) with create actions (scan, receive engine, photograph, new order, add item, new transaction). Accessibility label **“New”**.

**Rules:**

1. Do **not** reduce (+) to a generic single-purpose “Add”.
2. Do **not** document or implement (+) as the AI composer **unless product explicitly migrates it** — AI is currently a hidden parked route `/(tabs)/ai`.
3. If product later makes (+) the **global AI action**, keep it a system-level composer, not “Add item”.
4. Quick Actions on Home must not duplicate the entire dock; shortcuts only.

*(Older notes claiming center orb 60 / stroke 2.5 / dock radius 24 are stale — use the table above.)*

#### Hierarchy & presentations

| Category | Behavior | Code |
| --- | --- | --- |
| Tab root | Crossfade / tab switch | `navigation-policy` `tabRoot` |
| Push / drill-in | Platform stack + back gesture | `drillIn` |
| Page sheet | Card-style present | `pageSheet` |
| Form sheet | Forms / finance subflows | `formSheet` |
| Modal task | Centered / modal | `modalTask` |
| Sheet | Detents compact · medium · large · full | `components/ui/sheet.tsx` |
| Full-screen / immersive | Scan, intake | `immersive` |
| Action overlay | Custom RN bubble menu (not system share sheet) | `ActionSheetHost` |

Prefer `Sheet` over raw `@gorhom/bottom-sheet` per feature.

---

### Charts

**Current stack:** Custom SVG (`react-native-svg`) — `components/charts/line-chart.tsx`, Finance `FinCurveChart` / sparklines, overview sparklines. **No** Victory, Skia, or Recharts in dependencies today.

**Target chart language** (Health-inspired, AutoCore-owned):

| Spec | Guidance |
| --- | --- |
| Axes | Minimal — prefer no full box; light baseline or none |
| Grid | Absent or single quiet horizontal guide |
| Line | Smooth; stroke **~1.75–2.0** (current LineChart **1.75**) |
| Points | Emphasize last point **r ≈ 3**; hide intermediate unless scrubbing |
| Area | Optional fill opacity **~0.12** (current); no loud gradients |
| Gradient | Soft fade only if it aids series read; never decorative mesh |
| Bar | Rounded sparklines for week strips; latest bar slightly brighter |
| Sparkline | Inline in metric/trend rows; height ~32–48 |
| Colors | `chart1`–`chart5` / semantic success·warning |
| Touch | Pan scrub; show tooltip/value; selection haptic light |
| Tooltip | Compact caption + tabular number; floating near finger; use elevated surface |
| Animation | Draw/settle **220–420ms**; use `tokens.motion`; honor reduced motion |
| Period switch | Segmented control above chart |
| Empty | Type-led empty — no fake sine wave |
| Loading | Structure-preserving skeleton matching chart frame |

**Technical direction:** React Native + **Skia + Reanimated + Gesture Handler** is preferred for interactive Health-grade charts when investing in a shared chart package. Victory Native XL is optional only if it fits architecture without fighting tokens — **do not add libraries in drive-by UI work**. Until then, extend the existing SVG primitives to match this language.

Charts must look like AutoCore, not default chart-kit chrome.

---

## 5. Information architecture principles

### Home = Dynamic Business Summary

Home is **not** a static dashboard wallpaper.

**Current (code):** Mission Control — greeting → optional Attention → **Revenue hero** → stat tiles → Quick Actions → Featured insight → Activity (`features/overview/`).

**Target structure:**

1. **Dynamic Summary** — 1–3 metrics chosen by relevance (not fixed Revenue-first)
2. **Trends** — quiet charts / deltas for selected metrics
3. **Needs attention** — only if non-empty
4. **Quick actions** — shortcuts (not full nav duplicates)
5. **Recent activity** — feed

**Summary selection signals (product logic — do not invent APIs here):**

importance · urgency · trend · anomaly · recency · user role · user preferences

Revenue/Balance may appear when they win those signals — they are **not** mandatory slot 1.

**Rules:**

- Home summarizes; **Work** executes  
- Hide empty sections  
- Prefer grouped surfaces over card grids as density increases  
- Create remains on dock (+) / Action sheet  

### Other primary surfaces (current → direction)

| Surface | Current pattern | Direction |
| --- | --- | --- |
| **Work** | Grouped catalog, Today card, search overlay | Keep grouped IA; align radii/type to tokens |
| **Engines** | FlashList catalog + filters; detail as document chapters | Keep list density; Health-like detail chapters |
| **Engine detail** | Hero + identity + specs + docs | Progressive disclosure; avoid card spam |
| **Finance** | Health → profit → trends → flows → ledger | Strongest Stripe+Health hybrid today — **reference implementation** for density |
| **Settings** | `ListSection` + `CollectionRow` | Canonical grouped list — **reuse everywhere** |

---

## 6. Responsive / platform behavior

| Topic | iOS | Android |
| --- | --- | --- |
| Safe areas | Respect all insets; dock `safe + 8` | Same |
| Status bar | Content style from scheme (`root-navigator`) | Same |
| Navigation | Native stack push; page/form sheets | Platform stack; sheets via Gorhom/`Sheet` |
| Dock | Liquid glass when API available | Dense stadium fallback — do not fake glass |
| Live Activities | `expo-widgets` Dynamic Island | Not applicable — never show fake Island UI |
| Keyboard | Avoidance on forms; search dismiss patterns | Window soft input + same UX |
| Haptics | `expo-haptics` via `theme/haptics` | Supported where available; no-op safe |
| Touch targets | ≥ 44pt | ≥ 48dp preferred; never below 44 |
| Dynamic Type | Scale with multiplier cap | Font scale with same components |
| Dark mode | Token dark palette | Same tokens |
| Hairlines | 0.33 | 1 |

Do not break platform conventions without a documented reason.

---

## 7. Accessibility

| Rule | Spec |
| --- | --- |
| Min touch target | **44×44** (`tokens.control.hitTarget`); visual may be smaller with hitSlop |
| Text contrast | Use semantic pairs; rely on `contrastContract` / `npm run tokens:check` |
| Semantic colors | Status via token families |
| Labels | `accessibilityLabel` / `Hint` / `Role` / `State` on controls (dock, rows, buttons) |
| Dynamic Type | Allow scaling; cap via `maxFontSizeMultiplier`; no clipped titles |
| Screen reader | Meaningful labels; announce sheet open/close; don’t rely on icon alone |
| Reduced motion | `useMotion()` / `useReducedMotion()` — shorten travel, disable ornamental motion |
| **Non-color indicators** | Availability, condition, warning, error, status must include **text and/or icon** — color never sole channel |

---

## 8. Existing → Target

| Current AutoCore | Target | Priority | Reason |
| --- | --- | --- | --- |
| `@autocore/design-tokens` color SSOT | **Keep** | — | Shared, contrast-tested, brand-correct |
| `theme/tokens.ts` space/radius/motion | **Keep** | — | Already Health-like rhythm |
| `theme/typography.ts` HIG scale | **Keep**; kill feature forks | High | Single type ladder |
| Floating liquid-glass dock | **Keep** metrics from `floating-tab-bar-inset.ts` | — | Distinctive shell |
| Dock (+) = New / Action sheet | **Keep** as global system action; never generic Add | — | Matches code; AI remains parked |
| `/(tabs)/ai` stub | Parked until product-ready; don’t dock prematurely | Medium | Avoid fake AI chrome |
| Home Mission Control card stack + revenue-first | **Replace** with Dynamic Business Summary IA | High | Align Health Summary + relevance |
| Home Quick Actions → Add/Scan/Inventory/Finance | Keep shortcuts; **remove** pure dock duplicates; no fake AI tile unless live | Medium | Action follows information |
| `ListSection` + `CollectionRow` | **Promote** as default directory pattern | High | Consistency |
| Parallel card components (`dashboard-card`, `stat-card`, `glass-card`, …) | **Converge** on typed metric/trend/insight + `Surface` | High | Stop one-offs |
| Finance `FinCurveChart` + narrative | **Keep** as chart/density reference; extract shared chart language | High | Best ops UI in app |
| SVG `LineChart` | **Evolve** toward chart language; Skia later if needed | Medium | Quiet Health-like series |
| Work private colors `#635BFF` | **Deprecated** → design-tokens | High | Semantic color principle |
| `finType` 46/56 hero sizes | **Replace** with `metric`/`title1` | Medium | Type SSOT |
| Engines `radius: 8` local | **Replace** with `tokens.radius.control` | Low | Radius SSOT |
| Raw Gorhom call sites | **Migrate** to `Sheet` | Medium | Interaction consistency |
| NativeWind unused + Geist in Tailwind config | **Ignore** for product UI; don’t expand | Low | Avoid dual styling |
| Structure skeletons / `EmptyState` / `ContentState` | **Keep** | — | Loading/empty language is sound |
| Fake interactive chrome (historical audit) | **Fix** as trust work, not visual polish | Critical | Craft requires truth |
| Live Activities intake | **Keep** | — | Native excellence |
| Appearance accent overrides | **Keep** as settings; default brand blue | Low | Personalization without breaking SSOT |

---

## 9. Implementation rules

1. **Reuse tokens** — never hardcode arbitrary colors, spacing, or radii in feature files.  
2. **Reuse the spacing scale** — `tokens.space` / `spacing[]` only.  
3. **Do not create one-off cards** — use typed metric/trend/insight/attention or grouped `Surface`.  
4. **Prefer grouped lists** over collections of individual cards for directories.  
5. **Do not duplicate dock destinations** inside Quick Actions without shortcut value.  
6. **Use semantic colors**; pair status color with text/icon.  
7. **Keep charts visually quiet** — minimal axes, restrained area opacity, no chart-kit defaults.  
8. **Prefer progressive disclosure** — hide empty optional sections.  
9. **Keep primary actions obvious but not oversized.**  
10. **Center dock control is a global system action** (New sheet today) — never a generic single-entity Add; don’t silently turn it into AI without product decision.  
11. **Import from `@/theme`** — `tokens`, `typography`, `useMotion`, colors via `useTheme`.  
12. **Five springs only** — `press` · `settle` · `sheet` · `list` · `nav`.  
13. **Touch targets ≥ 44**; use hitSlop when visuals are smaller.  
14. **Sheets via `Sheet` detents** — don’t fork Gorhom per feature.  
15. **Home summarizes; Work executes.**  
16. **Summary metrics are relevance-ranked** — not hard-coded Revenue-first.  
17. **No uppercase section stamps** — `sectionLabel` sentence case.  
18. **No parallel feature type/color/spacing systems.**  
19. **Respect reduced motion and Dynamic Type caps.**  
20. **Modules never add dock tabs** — content goes inside Home/Work/Finance/Settings or push/sheet.  
21. **Fill or hairline, never both + shadow** on cards.  
22. **Verify interactive chrome does what it claims** (no decorative chevrons / fake swipes).

---

## 10. Current project assessment

Scores reflect **mobile product UI as implemented** (theme quality vs screen consistency), 1–10:

| Dimension | Score | Notes |
| --- | --- | --- |
| Visual consistency | **6** | Strong token foundation; feature forks (Work colors, Finance type, Home card dialect) dilute it |
| Information hierarchy | **6** | Finance/Settings/Engines clearer; Home still card/KPI wallpaper |
| Density | **6** | Linear-capable in Work/Finance; Home too sparse/cardy; overall uneven |
| Native iOS feel | **7** | Dock glass, sheets, SF symbols, Live Activities — high; Android fallback honest |
| Component consistency | **5** | Many overlapping card/list primitives; Sheet vs raw Gorhom |
| Accessibility | **6** | Labels and hit targets often present; Dynamic Type capped; color-only risks in status UI remain |
| Scalability | **6** | Token SSOT scales; without killing forks, new screens will keep diverging |

---

## 11. Recommended redesign order

Do **not** implement in this documentation task. Suggested sequence for implementers:

1. **Freeze SSOT** — treat this file + `packages/design-tokens` + `theme/tokens.ts` / `typography.ts` as law; annotate `DESIGN.md` conflicts as stale.  
2. **Kill parallel tokens** — Work private colors; Finance/Engines private type/radius; stop new hex.  
3. **Converge list/surface primitives** — one grouped list dialect; deprecate redundant card wrappers.  
4. **Chart language extraction** — shared quiet line/area/sparkline API from Finance + `LineChart` (SVG now; Skia when interaction demands).  
5. **Home → Dynamic Business Summary** — relevance-ranked Summary, Trends, Attention, Quick Actions, Activity (no mandatory Revenue hero).  
6. **Search & filter trust pass** — real navigation, clear filter reset, consistent `SearchInput`.  
7. **Sheet migration** — all feature sheets through `Sheet`.  
8. **Finance polish within language** — keep narrative; align type to HIG metric scale.  
9. **Work / Engines alignment** — density kept; tokens only.  
10. **Settings IA cleanup** — reuse as canonical grouped reference; remove dead toggles (per UX audit).  
11. **A11y pass** — non-color status, Dynamic Type at large sizes, VoiceOver on Summary.  
12. **AI surface** — only when product-ready; decide dock vs entry from Work/Home without fake chrome.

---

## Appendix A — Key file map

| Area | Path |
| --- | --- |
| Colors | `packages/design-tokens/src/colors.ts` |
| Mobile theme barrel | `autocore-mobile/theme/` |
| Tabs / dock | `autocore-mobile/app/(tabs)/_layout.tsx`, `components/navigation/liquid-glass-tab-bar.tsx` |
| Tab specs | `autocore-mobile/lib/navigation/tab-specs.ts` |
| Action sheet | `autocore-mobile/components/navigation/action-sheet-host.tsx` |
| Home | `autocore-mobile/features/overview/` |
| Work | `autocore-mobile/features/work/` |
| Finance | `autocore-mobile/features/finance/` |
| Engines | `autocore-mobile/features/engines/`, `features/objects/` |
| Settings | `autocore-mobile/features/profile/`, `features/settings/` |
| UI kit | `autocore-mobile/components/ui/` |
| Charts | `autocore-mobile/components/charts/`, Finance `fin-*` charts |
| DEV gallery | `autocore-mobile/app/design-system.tsx` |

---

## Appendix B — Audit method

- Inspected mobile theme, design-tokens, navigation, overview/work/finance/engines/settings, UI components, charts, and existing docs (`DESIGN.md`, `MOBILE-UX-AUDIT.md`).  
- Dock **+** verified in code as New/Action sheet (`accessibilityLabel` “New”), not AI composer.  
- No UI code was changed for this document.
