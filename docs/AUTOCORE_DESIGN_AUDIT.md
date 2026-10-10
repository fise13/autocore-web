# AutoCore Design Audit (Web Product)

**Date:** 2026-10-10
**Scope:** Web dashboard (`src/app/(dashboard)`, `src/components`, `src/styles`, `src/app/globals.css`) and the shared colour package (`packages/design-tokens`). Marketing (`src/components/marketing`, `src/styles/marketing-experience.css`) and print/PDF templates are referenced only where they share primitives. Mobile (`autocore-mobile/`) is already covered by [`design-language.md`](./design-language.md) and is out of scope except for token parity.
**Status:** Audit only. No application source code was changed.

**Companion documents**

| Document | Role |
| --- | --- |
| [AUTOCORE_DESIGN_LANGUAGE.md](./AUTOCORE_DESIGN_LANGUAGE.md) | Target design language for the web product |
| [AUTOCORE_DESIGN_TOKENS.md](./AUTOCORE_DESIGN_TOKENS.md) | Token values, mappings and code for the existing stack |
| [AUTOCORE_ICON_AND_COPY_AUDIT.md](./AUTOCORE_ICON_AND_COPY_AUDIT.md) | Icon inventory, verified icon mapping, copy fixes |
| [design-language.md](./design-language.md) | Existing mobile design language (v1). Still authoritative for `autocore-mobile/` |
| [WEB-DESIGN.md](./WEB-DESIGN.md) | Existing short web/marketing brief. Still authoritative for marketing |
| [I18N-TERMINOLOGY.md](./I18N-TERMINOLOGY.md) | Normative glossary. This audit checks UI copy against it |

**Evidence labels**

- **[FACT]** Verified directly in source, in a pinned dependency, or by a calculation that was actually run.
- **[INFERENCE]** A reasoned conclusion from the implementation that was not observed in a running UI.
- **[RECOMMENDATION]** A proposed change.

---

## 1. Method and limitations

### What was done

| Activity | How |
| --- | --- |
| Source reading | Routes, layouts, shell, sidebar, top bar, all `src/components/ui/*` primitives, the three Excel-style grids, work-order, accounting, warehouse, engine-intake and overview components, `globals.css`, `src/styles/*.css`. |
| Token pipeline | Read `packages/design-tokens/src/{colors,contrast,css}.ts`, `scripts/design-tokens/*.mjs`, generated `src/styles/design-tokens.css`. Ran `scripts/design-tokens/check-contrast.mjs` with Node 22 (result: 32/34 pass, 2 waived, 0 failing). |
| Contrast maths | A scratch script (WCAG 2.x relative-luminance formula, alpha compositing, OKLCH→sRGB) measured the actual class combinations found in components. Tailwind palette values were taken from the pinned `tailwindcss@4.3.0` `theme.css` (OKLCH), not from memory. |
| Icon verification | Downloaded the pinned `lucide-react@1.16.0` and resolved every icon name imported in `src/` (238 unique names, 838 imports) to its canonical export. Every recommended icon name in these documents was checked against the same package. |
| Font verification | Downloaded `geist@1.7.2` and read the TTF `GSUB` and `cmap` tables for `tnum`, Cyrillic, `№` and `₸` coverage. |
| Usage counts | `grep`-based counts across `src/` (exact commands are reproducible; counts exclude `src/components/marketing` where stated). |

### What was NOT done

- **No rendered UI was inspected.** `node_modules` is not installed in this environment and the dashboard requires Firebase credentials and an authenticated session. No screenshots, browser automation, screen-reader or keyboard walkthroughs were performed. Every visual claim is therefore code-derived; items that depend on rendering are labelled [INFERENCE].
- `npm run tokens:check` (the stale-CSS half) could not run without `tsx`; only the contrast half was executed.
- Geist was verified from the npm `geist@1.7.2` build. `next/font/google` serves Google's build, which may differ in minor glyph coverage.
- Contrast for alpha-blended utilities is computed against the documented surface (`card`, `background`, `sidebar`). If a component sits on a different surface the ratio changes.

---

## 2. Product and architecture

### Stack [FACT]

| Layer | Implementation |
| --- | --- |
| Framework | Next.js 16 App Router, React 19.2, TypeScript (`package.json`) |
| Styling | Tailwind CSS v4 (`@tailwindcss/postcss`, `tailwindcss@4.3.0`), CSS-first config via `@theme inline` in `src/app/globals.css:20`. No `tailwind.config.*`. |
| Component base | shadcn `base-nova` style on **Base UI** primitives (`components.json`, `@base-ui/react`), `class-variance-authority`, `tailwind-merge` |
| Colour tokens | Single source of truth `packages/design-tokens/src/colors.ts`, generated to `src/styles/design-tokens.css`, shared with Expo mobile |
| Theme | `next-themes`, `attribute="class"`, `defaultTheme="system"` (`src/components/providers/app-providers.tsx:23`) |
| Fonts | Geist Sans (latin + cyrillic) and Geist Mono (latin only) via `next/font/google` (`src/app/layout.tsx:15-23`) |
| Icons | `lucide-react@1.16.0` only. No other icon library is imported in `src/`. |
| Motion | `motion/react`, CSS keyframes in `globals.css`; GSAP/anime.js/Barba for marketing |
| Toasts | `sonner` wrapped by `src/components/ui/sonner.tsx` and `toast-provider.tsx` |
| Charts | `recharts` via `src/components/ui/chart.tsx` |
| i18n | `userCopy` proxy over `src/lib/user-copy.{en,ru}.ts` (≈4,600 lines each) plus `packages/i18n` JSON for marketing/a11y/validation |
| Desktop | Tauri 2 shell loads the hosted web app (`src-tauri/`) |

### Product surfaces (routes) [FACT]

| Area | Routes |
| --- | --- |
| Overview | `/home`, `/activity`, `/status`, `/changelog`, `/help` |
| Inventory | `/motors` (engines, transmissions, parts via `?collection=`), `/specific/[categoryId]`, `/warehouse` (consumables), `/stocktake`, `/sold`, `/donors`, `/used-parts`, `/engine-intake`, `/media/[entityKind]/[entityId]` |
| Work orders | `/work-orders`, `/work-orders/[id]`, `/quotes` |
| Finance | `/accounting`, `/my-earnings` |
| Documents | `/documents`, print routes under `(print)`, public `/warranty/[token]` |
| Import | `/imports`, `/imports/[id]`, `/imports/batch/[batchId]`, `/import`, `/migration` |
| People | `/team`, `/employees`, `/roles` |
| Other | `/settings`, `/ai`, auth (`/login`, `/demo`, `/join`, `/invite/[token]`, `/welcome`) |

### Users and workflows [INFERENCE from domain models and copy]

- **Warehouse and intake staff:** high-volume data entry in the Excel-style grids (`motors-excel-grid.tsx`, `warehouse-excel-grid.tsx`, `specific-excel-grid.tsx`), barcode scanning from the top bar, engine intake verification (quarantine, reject, release).
- **Sales / managers:** sell and return engines from grid rows, reserve stock, issue warranty documents and invoices.
- **Workshop:** work-order lifecycle `draft → confirmed → in_progress → waiting_parts → completed → delivered` or `cancelled` (`src/domain/work-order.ts`).
- **Owners / accountants:** finance operations, payroll, advances, data clean-up.
- Primary language is Russian (KZ market evidence: `ru-KZ`, `kk-KZ`, `KZT` in `src/lib/money/display-currency.ts`); English is the source language for keys (`I18N-TERMINOLOGY.md`).

These users spend long sessions in dense tables, read serial numbers and engine codes character by character, and act on status. That makes **numeric legibility, status semantics, keyboard flow and contrast** the highest-value design properties, ahead of decoration or brand expression.

---

## 3. Current design system inventory

### 3.1 What exists and works well [FACT]

- A real, shared token package with a **four-part tone contract** (`x`, `xForeground`, `xSubtle`, `xOnSubtle`, `xBorder`) whose subtle/border values are pre-composited for predictable contrast, and an automated AA checker (`scripts/design-tokens/check-contrast.mjs`).
- `Badge` already consumes the tone tokens (`src/components/ui/badge.tsx:15-31`) and documents why alpha blending was dropped.
- Base UI primitives give correct focus management for Dialog, Select, Tabs, Tooltip, Menu.
- `prefers-reduced-motion` is honoured for almost every custom animation (`globals.css` reduced-motion blocks; `motion-reduce:` on dialogs; `useReducedMotion` in the top bar).
- Grids have a density model by container width (`src/lib/grid/grid-density.ts`) and pinned columns.
- A terminology glossary exists and is precise (`docs/I18N-TERMINOLOGY.md`).
- Lucide is the only icon library and it auto-applies `aria-hidden="true"` to decorative icons in v1.16 (`Icon.mjs`).

### 3.2 Component inventory (`src/components/ui`, 54 files) [FACT]

| Category | Present | Missing as a primitive |
| --- | --- | --- |
| Actions | `button`, `button-group`, `kbd` | — |
| Inputs | `input`, `textarea`, `select`, `input-group`, `datalist-input`, `grouped-number-input`, `search-combobox`, `field`, `label` | `checkbox`, `switch`, `radio-group` (9 product files use native `type="checkbox"`; 0 use `role="switch"`) |
| Overlays | `dialog`, `sheet`, `dropdown-menu`, `tooltip`, `hover-card`, `command` | `alert-dialog` (destructive confirmation), `popover` |
| Data display | `table`, `card`, `badge`, `kpi-card`, `delta`, `chart`, `progress`, `avatar`, `item` | `pagination` (none anywhere) |
| Feedback | `sonner`, `toast-provider`, `skeleton`, `spinner`, `empty-state`, `empty`, `alert` | — |
| Navigation | `sidebar`, `tabs`, `breadcrumb`, `navigation-menu` | — |
| Unused (0 imports) | `dock`, `marquee`, `kinetic-text`, `scroll-based-velocity`, `grid-pattern`, `usage-meter` | — |

Also unused at top level: `support-activity.tsx`, `team-on-duty.tsx`, `recent-conversations.tsx`, `cobe-globe.tsx`, `decor-icon.tsx`, `faqs-section.tsx`.

### 3.3 Styling layers [FACT]

1. Generated colour variables (`design-tokens.css`).
2. Tailwind utilities through `@theme inline` (`globals.css:20-100`). **Not mapped:** the `offline*` tone family (0 usages of `bg-offline`/`text-offline` in `src`).
3. Hand-written component classes in `globals.css`: `autocore-*` and `mc-*` (overview "command center"), sidebar motion, auth OAuth buttons.
4. Raw Tailwind palette classes in components: **421 occurrences across 75 non-marketing files** (amber 131, emerald 126, neutral 31, sky 29, red 24, blue 10, violet 6, …).
5. Inline `style={{}}` colours in grids (`rgb(22, 163, 74)`, `gridPalette`).

---

## 4. Findings by severity

Each finding lists evidence, impact and the recommended fix. Fix details live in the companion documents.

### Critical

#### C1. Core interactive and status colours fail WCAG AA, and the waiver that allows it rests on an incorrect premise

[FACT] Measured ratios (method in §1):

| Element | Source | Ratio | Required |
| --- | --- | --- | --- |
| Primary button text, light (white on `#0a73f2`) | `button.tsx:11` | 4.42:1 | 4.5:1 |
| Primary button **hover** (`hover:bg-primary/80` over `#f5f7fb`) | `button.tsx:11` | **3.34:1** | 4.5:1 |
| Destructive button, light (`text-destructive` on `bg-destructive/10`) | `button.tsx:18-19` | **3.54:1** | 4.5:1 |
| Destructive button, dark (`/20`) | same | 4.33:1 | 4.5:1 |
| Grid "Sell" chip in dark mode (`text-emerald-700` on `emerald-500/10`, no `dark:` variant) | `motors-excel-grid.tsx:1631`, `specific-excel-grid.tsx:1389`, `warehouse-excel-grid.tsx:1663` | **2.73:1** | 4.5:1 |
| Grid "Return" chip in dark mode (`amber-700`) | `motors-excel-grid.tsx:1630` | **2.84:1** | 4.5:1 |
| Work-order status `in_progress` in dark mode (`blue-700` on `blue-500/10`) | `work-order-copy.ts:98` | **2.21:1** | 4.5:1 |
| Overview income value (`text-emerald-500` on card) | `overview/modules/accounting-module.tsx:62` | **2.47:1** | 4.5:1 |
| Overview expense value (`text-red-400` on card) | `accounting-module.tsx:63` | **2.89:1** | 4.5:1 |
| Password strength "good" (`text-amber-500`) | `auth/password-strength-field.tsx:93` | **2.13:1** | 4.5:1 |
| Sidebar active item, light (`text-primary` on `bg-primary/12` over sidebar) | `sidebar-nav-row.tsx:41` | **3.39:1** | 4.5:1 |

[FACT] The waiver in `scripts/design-tokens/check-contrast.mjs:19-22` says white on `#0a73f2` is acceptable because "buttons render at >=14px semibold, which clears the 3:1 large-text bar." WCAG defines large text as **14 pt (≈18.67 px) bold or 24 px regular**. Buttons render at `text-sm` (14 px) and `font-medium` (500) (`button.tsx:8`), so they are normal-size text and need 4.5:1.

**Impact:** The most frequently clicked control in the product, every destructive action, and money values on the Overview are below AA. Dark mode makes in-grid actions nearly unreadable.

**Recommendation:** Split *brand* blue from *interactive* blue: keep `#0a73f2` as the brand mark and chart colour, and use `#0866d6` (5.41:1 with white) for the light-theme primary fill, `#0758bd` hover (6.69:1), `#064ca3` pressed (8.17:1). Use opaque hover tokens, never `/80` alpha. Switch the destructive button to the existing `danger-subtle`/`danger-on-subtle` pair (5.01:1 light, 4.97:1 dark, already in the contract) or to a solid `#d4292e` fill (5.05:1). Replace every raw palette text colour with tone tokens. Remove the waiver once fixed. See TOKENS §2.

#### C2. The core data grids are invisible to assistive technology

[FACT] `motors-excel-grid.tsx` (1,990 lines), `warehouse-excel-grid.tsx` (1,998) and `specific-excel-grid.tsx` (1,610) render cells as absolutely positioned `div`s with **no** `role="grid"`, `row`, `gridcell`, `columnheader`, `aria-rowcount`, `aria-rowindex`, `aria-selected` or `aria-activedescendant` (0 matches each). Each grid has a single `tabIndex` focus container.

**Impact:** The engine, warehouse and catalog grids are the product's centre of gravity. A screen-reader user hears nothing meaningful; voice-control users cannot target cells. This is the largest accessibility gap in the product.

**Recommendation:** Implement the WAI-ARIA grid pattern on the shared grid shell: `role="grid"` with `aria-rowcount`/`aria-colcount` (virtualised), `role="row"` + `aria-rowindex`, `role="gridcell"` + `aria-colindex` + `aria-selected`, header cells as `role="columnheader"` with `aria-sort`, and `aria-activedescendant` on the focus container so the existing keyboard engine keeps working. Do this once in a shared grid shell (see M5), not three times.

### High

#### H1. Status colour semantics differ between screens for the same status

[FACT] Work orders have two parallel mappings in the same file, `src/components/work-orders/work-order-copy.ts:95-112`:

| Status | List (`statusBadgeVariant`, used in `work-order-list-panel.tsx:281`) | Detail (`statusTone`, used in `work-order-detail-panel.tsx:231`) |
| --- | --- | --- |
| `confirmed` | `info` (blue tokens) | violet raw palette |
| `in_progress` | `info` (blue tokens) | blue raw palette, no dark variant |
| `cancelled` | `destructive` | destructive at 10% alpha |

[FACT] Other status maps are hue-named rather than meaning-named (`accounting/metric-card.tsx:22-25` `green | blue | amber | red`; `accounting/advances-overview.tsx:66-68` `green | orange | red`), and payroll / my-earnings status pills use raw `emerald-700`/`amber-700` without dark variants (`payroll-table.tsx:94-95`, `my-earnings-table-section.tsx:75-76`).

[FACT] `cancelled` work orders are red (destructive). Cancellation is a normal business outcome, not an error.

**Impact:** The same work order changes colour when the user opens it. Users who scan status by colour in a list cannot transfer that learning to the detail view. Red for cancelled competes with real errors.

**Recommendation:** One `status → tone + icon + label` registry per domain entity (motor, work order, used part, payroll, import job) consumed by a single `StatusBadge`. Five tones only: neutral, info, success, warning, danger. Mapping in LANGUAGE §3.5.

#### H2. Grid selection is hard-coded green, theme-blind, and collides with "available"

[FACT] `src/lib/grid/grid-palette.ts` hard-codes `rgb(22, 163, 74)` (green) for selection and the active-cell border; it is repeated inline (`motors-excel-grid.tsx:1551,1564,1706`, `grid-editor-overlay.tsx:410`, and the warehouse/specific grids). There is no dark-mode value. The same green family is used for the "Sell" action chip and for "available/in stock" states.

[INFERENCE] The green mirrors Microsoft Excel's selection colour on purpose. In AutoCore, green already means "available / success", so a selected sold engine looks "available".

**Impact:** Selection and status share one colour channel; dark mode uses a light-mode colour.

**Recommendation:** Grid selection uses the brand interaction colour via tokens: `--grid-selection` (light `#e7f1fe`, dark `#23324a`) and `--grid-active-border` (light `#0866d6`, dark `#4d96ff`). Measured: border vs. fill 4.74:1 light, 4.38:1 dark; body text on fill 16.27:1 / 11.86:1. Keeping Excel green is a product-owner decision (see §7).

#### H3. Focus indicators are too faint

[FACT] Controls use `focus-visible:ring-3 focus-visible:ring-ring/50` with `ring = #66b8ff` (`button.tsx:8`, `input.tsx:12`, `select.tsx`, `tabs.tsx`). Measured against a white card: 50% ring **1.44:1**, solid ring 2.13:1 (light). Dark: 2.99:1 at 50%.

**Impact:** WCAG 2.2 requires a visible focus indicator (2.4.7) and 3:1 for component state indicators (1.4.11). Keyboard users of a keyboard-heavy product cannot reliably see focus in the light theme.

**Recommendation:** 2 px solid ring, 2 px offset, `--focus-ring` light `#0866d6` (5.41:1 on card, 5.04:1 on canvas, 4.81:1 on sidebar), dark `#66b8ff` (7.98:1 on card). Use an offset (or an inner `background` ring) on primary-filled controls, because the dark ring on the dark primary fill is only 1.39:1.

#### H4. Numbers, prices and identifiers are not set for scanning

[FACT]
- Warehouse grid centres quantity and price columns (`On hand`, `Reserved`, `Available`, `Purchase`, `Sale`; `src/lib/warehouse/warehouse-grid-layout-engine.ts` `align: "center"`) and has **0** `tabular-nums` usages. The engine grid applies `tabular-nums` to dates, serials and quantity only (`motors-excel-grid.tsx:146-165`).
- Number formatting mixes locales: app-wide grouping is deliberately `en-US` (`src/lib/money/format-number.ts:3`, `1,234,567`), 23 call sites use `toLocaleString("en-US")`, while others use `ru-KZ` (narrow no-break-space grouping) and `kk-KZ` for KZT currency (`display-currency.ts:27`).
- `KpiCard` hard-codes `Intl.NumberFormat("en-US")` (`kpi-card.tsx:39`).
- Neither Geist Sans nor Geist Mono contains `₸` (U+20B8) (font table check), while KZT is a supported display currency, so the tenge sign renders from a fallback font. [INFERENCE: visible metric mismatch next to Geist digits.]
- Geist Mono is loaded with `subsets: ["latin"]` only (`layout.tsx:22`) although the font file contains Cyrillic.

**Impact:** Centred numbers cannot be compared down a column. Two grouping styles for the same amount on different screens erode trust in figures.

**Recommendation:** Right-align all quantities and money, `tabular-nums` on every numeric cell, one formatting module per value type (quantity, money, date, identifier) with an explicit product decision on grouping style (§7). Add the `cyrillic` subset to Geist Mono. Render the currency code or symbol in a separate muted span so a fallback glyph does not shift digit alignment.

#### H5. Terminology drift and untranslated strings in production UI

[FACT] Against `I18N-TERMINOLOGY.md`:

| Rule in glossary | Violation | Where |
| --- | --- | --- |
| "Overview: Protected product name. Never translate." | Nav label is «Дашборд» / "Dashboard" | `user-copy.ru.ts:368`, `user-copy.en.ts:370` |
| Engine vs Motor: "Do not mix both labels in the same screen hierarchy." | Sidebar shows «Двигатели», «Добавить двигатель», and the same sidebar's context panel shows «Моторы», «Добавить мотор», «Продать мотор» | `user-copy.ru.ts:389,398,495-498` |
| Inventory = «Складской учёт»; Warehouse = «Склад» | Inventory nav item is labelled «Склад» / "Warehouse" | `user-copy.ru.ts:371`, `user-copy.en.ts:373` |

[FACT] English strings shipped to Russian users: engine intake success messages (`engine-intake-detail.tsx:329-385`, e.g. "Released to Motors Grid", "Engine moved to quarantine"), dialog close label and footer button "Close" (`ui/dialog.tsx:78,116`), spinner `aria-label="Loading"` (`ui/spinner.tsx:6`). The Russian copy itself contains the internal name «Выпустить в Motors Grid» (`user-copy.ru.ts:4424`).

**Impact:** Inconsistent nouns for the core entity, untranslated feedback on a critical verification step, and an internal code name visible to customers.

**Recommendation:** Copy fixes in [AUTOCORE_ICON_AND_COPY_AUDIT.md](./AUTOCORE_ICON_AND_COPY_AUDIT.md) §5. Lint rule or test that fails on string literals passed to `toast`, `message =`, `aria-label` and `sr-only` in product components.

#### H6. Destructive and irreversible actions lack a consistent confirmation pattern

[FACT]
- Import **rollback** (deletes imported rows) uses the browser's native `confirm()` (`warehouse-import-history-panel.tsx:74`, `motor-import-history-panel.tsx:79`).
- Warehouse CSV import reports success through `alert()` (`warehouse-import-dialog.tsx:76`).
- There is no `AlertDialog` primitive (0 files). Data clean-up and other destructive confirmations are composed ad hoc from `Dialog`.

**Impact:** Native dialogs ignore theme, typography and locale of the button labels ("OK/Cancel" come from the browser), block the tab, and cannot name the consequence clearly.

**Recommendation:** Add an `alert-dialog` primitive (Base UI `AlertDialog`) with a fixed anatomy: title as a question naming the object, consequence sentence, explicit verb on the confirm button, Cancel focused by default, and type-to-confirm for company-wide wipes. Spec in LANGUAGE §7.8.

#### H7. Page structure: no consistent page header and missing `<h1>` in core workspaces

[FACT] The component folders for Engines (`motors`), Warehouse, Work orders, Finance (`accounting`), Employees, Sold, Specific, Settings and Team contain **no `<h1>`**. The top bar shows the page title as a `span` (`dashboard-top-bar.tsx:51-56`). Where `<h1>` exists outside marketing, there are 18 distinct class strings using seven sizes (`text-base`, `text-lg`, `text-xl`, `text-2xl`, `text-[1.75rem]`, `text-3xl`, `text-4xl`); there is no shared product `PageHeader` (only `marketing/site/page-header.tsx`).

**Impact:** Screen-reader users cannot navigate by heading (WCAG 1.3.1, 2.4.6); visual hierarchy differs per page.

**Recommendation:** The top-bar title becomes the page `<h1>` (one per route), and a single `PageHeader` handles title, count, primary action and secondary actions for non-grid pages.

### Medium

#### M1. Icon usage is inconsistent

[FACT] (full inventory in the icon audit):
- Of 838 icon imports, 88 (10.5 %) use a deprecated legacy name (21 distinct names, e.g. `Loader2`, `CheckCircle2`, `AlertTriangle`, `HelpCircle`, `MoreHorizontal`, `BarChart3`, `Home`) and 89 more use the `…Icon` suffix form, so one glyph is often reached three ways: `Loader2` (36), `Loader2Icon` (2), `LoaderCircle` (2); also `AlertTriangle`/`TriangleAlert`, `HelpCircle`/`CircleHelp`, `MoreHorizontal`/`Ellipsis`/`EllipsisIcon`, `X`/`XIcon`.
- Two different success glyphs: `CheckCircle2` → `CircleCheck` (13 imports) and `CheckCircleIcon` → `CircleCheckBig` (1).
- `Package` is both the Inventory parent and its Consumables child (`business-navigation.ts:60,99`).
- `Settings2` (sliders) means "Transmissions" in navigation (`business-navigation.ts:58`) and "Columns" in the top bar (`dashboard-top-bar.tsx:399`).
- `Cog` (Engines) and `Settings` (account menu) are both gears in the same sidebar.
- 18 different `strokeWidth` values in TSX (1, 1.1, 1.2, 1.25, 1.7, 1.75, 1.8, 2, 2.25, 2.4, 2.5, 2.6, 3, …); no `LucideProvider`.
- `Sparkles` (27 imports) stands for AI, app configuration (`settings-shell.tsx:38`), profile name, plan upsell and sale celebration.
- Finance uses `CircleDollarSign` although KZT is a display currency.
- A destructive glyph (`Trash2`) is the navigation icon for the "Data clean-up" settings section (`settings-shell.tsx:41`).

**Impact:** Weaker recognition, and ambiguous meaning for two glyphs in the primary navigation.

#### M2. Typography is improvised at the small end

[FACT] In non-marketing TSX: `text-[11px]` ×96, `text-[10px]` ×55, `text-[13px]` ×29, `text-[15px]` ×11, `text-[9px]` ×3. The `uppercase` utility appears in 35 non-marketing component files, mostly as tracked micro-labels (`mc-section-label` in `globals.css:676`, `sidebarSectionLabelClass` in `sidebar-nav-row.tsx:15`, the `KpiCard` label), although the existing mobile design language bans uppercase section stamps. `font-heading` maps to the same family as body (`globals.css:25`).

**Impact:** 9–10 px text is below comfortable reading size for long sessions; uppercase Cyrillic at 11 px with letter-spacing is especially hard to read; five ad-hoc sizes between 9 and 13 px make hierarchy accidental.

#### M3. Dark theme has structural gaps

[FACT]
- Dark `muted` equals dark `card` (`#1a1c24`, `colors.ts:200,215`). `TableRow` hover `hover:bg-muted/50` (`table.tsx:60`) and every `hover:bg-muted` on a card produce **no visible change** in dark mode.
- 35 lines in product components set a dark-ink raw colour (`text-{emerald,amber,red,sky,blue,violet}-{600,700,800}`) with no `dark:` counterpart (see C1 for measured examples).
- Browser `themeColor` is `#fafafa` / `#0a0a0a` (`layout.tsx:33-36`), not the token canvas `#f5f7fb` / `#0d0e12`.
- The `offline` tone family exists in tokens but is not exposed to Tailwind, so the status bar uses raw `text-sky-600` for offline/saving (`workspace-status-bar.tsx:71-73`).

#### M4. Control boundaries and sizes

[FACT] Input borders are `rgba(17,19,26,0.12)` → **1.29:1** against a white card (dark: 1.54:1). Inputs have a transparent background, so the border is the only visual boundary (WCAG 1.4.11 asks for 3:1 for the visual information required to identify a component). Default button and input height is 32 px (`button.tsx:24`, `input.tsx:12`); `icon-xs` is 24 px. On viewports <768 px buttons get `min-height: 2.25rem` but not a minimum width (`app-mobile.css:65-69`), so 32 px-wide icon buttons stay 32 px wide.

[INFERENCE] 32 px controls meet WCAG 2.2 Target Size Minimum (2.5.8, 24 px) but are small for touch on the Tauri/tablet use case.

#### M5. Duplicated implementations of the same component

[FACT]
- Three ~1.6–2k-line grid components each re-implement cell rendering, selection colours, action chips and context menus.
- Three KPI tiles: `ui/kpi-card.tsx`, `accounting/metric-card.tsx`, `overview/mc-stat-card.tsx`.
- Two empty-state systems: `ui/empty-state.tsx` (11 importers) and `ui/empty.tsx` (4 importers).
- `WEB-DESIGN.md` asks new forms to use `Field`/`FieldGroup`; only 3 files import `ui/field`, while 39 import the bare `Label`, and only 2 non-primitive components set `aria-invalid`.

**Impact:** Every visual fix has to be applied 2–3 times; behaviour drifts (e.g. warehouse grid lacks `tabular-nums` that the engine grid has).

#### M6. Decorative styling contradicts the documented direction

[FACT] `globals.css` contains gradient text (`.mc-hero-title`, line 738), radial-gradient glows and a 48 px grid backdrop (`.mc-canvas`, line 532), glass panels with `backdrop-filter`, hover "lift" (`translateY(-1px)` + large shadow) on metric and module cards, and inset white highlights. `backdrop-blur` appears in 29 product files, gradients in 10. `inventory-analytics-module.tsx:124-130` adds a blurred emerald glow behind a KPI. `.mc-icon-badge-amber` actually uses `--chart-4`, which is blue (`globals.css:664`), and `.mc-icon-badge-violet` uses `--chart-5`, which is gray.

[FACT] Several of these classes are unused (`mc-canvas`, `mc-hero-title`, `mc-glass-panel`, `mc-pulse-live`, `mc-theme`, `mc-live-badge`: 0 references).

**Impact:** Decoration competes with data, and hover lift on non-interactive tiles implies clickability.

#### M7. Icon-only buttons without accessible names

[FACT] Verified unlabeled icon buttons: document-import viewer zoom, rotate and fullscreen buttons (`document-import/document-import-viewer.tsx:132,141,150,159,178`), AI conversation scroll-to-bottom (`ai-elements/conversation.tsx:87`). Top-bar barcode button relies on `title` only (`dashboard-top-bar.tsx:419,433`).

#### M8. Sidebar active state relies on a low-contrast tint and a shadow

[FACT] Active row = `bg-primary/12 text-primary shadow-sm` (`sidebar-nav-row.tsx:41`): text 3.39:1 (light), and the tinted fill differs from the sidebar by 1.04:1 when rendered with the existing subtle token. Section labels are 11 px uppercase.

### Low

| ID | Finding | Evidence |
| --- | --- | --- |
| L1 | Unused components and CSS increase maintenance surface. | §3.2; unused `mc-*` classes in M6 |
| L2 | z-index values are ad hoc: `z-10`…`z-50`, `z-[55]`, `z-[65]`, `z-[70]`, `z-[75]`, `z-[80]`, `z-[100]`, `z-[220]`, `9999`. | `grep` across product TSX; `globals.css` page-transition overlay |
| L3 | Success toasts use `chart-2` instead of the success tone (`sonner.tsx:49`); the success icon `#26b34a` is 2.75:1 against the popover (non-text needs 3:1). | `ui/sonner.tsx:49,55` |
| L4 | Micro-copy inconsistencies: «Загрузка…» vs «Загрузка...» (`user-copy.ru.ts:1244`); «Сохранение…» vs «Сохраняем…» for the same state; «Загрузка» used for both *loading* and *uploading* (`:36`). | `user-copy.ru.ts` |
| L5 | `<html lang="en">` is server-rendered and corrected client-side (`layout.tsx:48`, `app-locale-provider.tsx:62`), so the first paint and non-JS crawlers see the wrong language. | — |
| L6 | `WEB-DESIGN.md` bans em-dashes in user-facing copy, but `user-copy.ru.ts` has 159 lines and `user-copy.en.ts` 143 lines containing «—». [INFERENCE] The rule was written for marketing; in Russian the dash is often grammatical. | — |
| L7 | `Badge` is a pill (`rounded-4xl`) although `WEB-DESIGN.md` reserves pills for interactive chips. | `ui/badge.tsx:13` |

---

## 5. Evaluation summary (14 criteria)

| # | Criterion | Rating | Key findings |
| --- | --- | --- | --- |
| 1 | Visual consistency across pages | Weak | H1, H7, M5, M6 |
| 2 | Information hierarchy | Fair | H7, M2 |
| 3 | Contrast and readability | **Poor** | C1, M4, M2 |
| 4 | Colour semantics and accessibility | Weak | H1, H2, M3 |
| 5 | Icon consistency and recognisability | Fair | M1 |
| 6 | Typography and numeric readability | Weak | H4, M2 |
| 7 | Spacing and component proportions | Fair | M4; spacing itself follows Tailwind's 4 px scale |
| 8 | Table and data-grid usability | Fair for mouse/keyboard, **Poor** for AT | C2, H2, H4 |
| 9 | Navigation and active states | Fair | M1, M8, H5 |
| 10 | Forms, validation and error feedback | Weak | M5 (`Field` underused, `aria-invalid` rare), H6 |
| 11 | Empty, loading and disabled states | Fair | Two empty-state systems; 39 files use spinners vs 25 skeletons; disabled = `opacity-50` everywhere |
| 12 | Light/dark consistency | Weak | M3, C1 dark rows |
| 13 | Accessibility and keyboard interaction | Weak | C2, H3, H7, M7 |
| 14 | Visual noise and decoration | Fair | M6 |

---

## 6. Recommended visual direction

**One direction: "Calm precision instrument."** A neutral, cool-gray workspace where colour is reserved for meaning, typography and alignment carry hierarchy, and every pixel of emphasis is spent on the next operational action.

| Question | Answer |
| --- | --- |
| Overall style | Flat, neutral surfaces with hairline structure. No gradients, glows, glass or hover-lift in product UI. Elevation only for floating layers (menus, dialogs, toasts). |
| Neutral vs expressive colour | Neutral. Brand blue appears on primary actions, links, focus, selection and the logo only. Green/amber/red/teal appear only as status. |
| Primary-action emphasis | One solid primary button per view region (page header, dialog footer, form). Toolbar actions are secondary or ghost. In grids, row actions are ghost or menu items, never coloured chips. |
| Density vs readability | Dense by default for grids (30 px rows at base density, already in code) and comfortable for forms and detail pages (36–40 px rows, 14 px body). Density changes row height and padding, never font size below 12 px. |
| Brand | **Preserve and refine.** Keep the AutoCore blue hue and logo. Split *brand* `#0a73f2` (logo, charts) from *interactive* `#0866d6` (light-mode fills, links, focus) to reach AA without a visible rebrand. |
| References, used for principles | **Linear:** keyboard-first density, quiet chrome, one accent. **Stripe Dashboard:** right-aligned tabular money, status badges with text, explicit destructive confirmations. **Vercel:** restrained neutrals, hairline borders, monospace for identifiers. **Raycast:** command palette as the fast path (AutoCore already ships `cmdk`). |
| Avoid | Gradient text, radial glows, background grid patterns, glass/`backdrop-blur` on in-flow content, uppercase tracked micro-labels, coloured icon wells as decoration, hue-named tones (`green`, `violet`), emoji, celebratory overlays in routine operations, centred numbers, red for non-error outcomes. |

Why not a more expressive direction: the users' attention is on serials, codes, quantities and status. Any colour that is not status competes with status.

---

## 7. Decisions that need product-owner approval

1. Split brand and interactive blue (`#0a73f2` brand, `#0866d6` light interactive). Affects mobile, which shares the token package.
2. Destructive solid fill changes from `#eb3838` to `#d4292e` in light theme.
3. Grid selection colour: brand blue (recommended) or keep Excel-style green.
4. Number grouping: keep `en-US` grouping app-wide (`1,234,567`) or adopt locale grouping (`1 234 567` for ru/kk). Current code mixes both.
5. Navigation names: «Дашборд» vs the protected "Overview"; «Склад» vs «Складской учёт» for the inventory group; «Двигатели» vs «Моторы» in the context panel.
6. Status tone mapping, especially `cancelled` → neutral (not red), `sold` → neutral, `reserved` → warning.
7. Input border strength (`#868b95`, 3.42:1) vs. the current hairline look.
8. Custom engine and gearbox glyphs (Lucide has none) built with `createLucideIcon`.
9. Scope of the em-dash rule (marketing only, or all UI).
10. Removing decorative overview styling (`mc-*` glows, gradient text, hover lift).
