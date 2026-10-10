# AutoCore Design Language (Web Product)

**Version:** 1.0 (proposed), 2026-10-10
**Applies to:** the web dashboard and the Tauri desktop shell that loads it. Marketing keeps [WEB-DESIGN.md](./WEB-DESIGN.md); mobile keeps [design-language.md](./design-language.md). Colour tokens are shared by all three through `packages/design-tokens`.
**Evidence:** [AUTOCORE_DESIGN_AUDIT.md](./AUTOCORE_DESIGN_AUDIT.md). **Values and code:** [AUTOCORE_DESIGN_TOKENS.md](./AUTOCORE_DESIGN_TOKENS.md). **Icons and copy:** [AUTOCORE_ICON_AND_COPY_AUDIT.md](./AUTOCORE_ICON_AND_COPY_AUDIT.md).

Labels used below: **Keep** (already right in code), **Change** (code differs; migrate), **New** (does not exist yet). Every contrast ratio quoted was calculated (WCAG 2.x formula) during the audit; ratios marked "non-text" are checked against 3:1, all others against 4.5:1.

---

## 1. Principles

1. **Status is the only colour.** Brand blue marks interaction (primary action, link, focus, selection). Green, amber, red, teal and gray mark state. Nothing else is coloured.
2. **Numbers line up.** Quantities and money are right-aligned and tabular. Identifiers are monospaced and never truncated.
3. **One primary action per region.** Page header, dialog footer, and form each get at most one filled button.
4. **Say what happens.** Buttons name the verb and the object. Destructive confirmations name the consequence.
5. **Density without shrinking text.** Compact mode reduces row height and padding, never body text below 12 px.
6. **Flat in flow, elevated only when floating.** Cards and panels use fill and a hairline. Shadows belong to menus, popovers, dialogs and toasts.
7. **Keyboard first, pointer friendly.** Every action reachable by keyboard, every focus visible, every icon-only control named.
8. **Same thing, same look.** A status, an icon or a component looks identical on every screen that shows it.

---

## 2. Visual direction

**Calm precision instrument** (rationale in the audit §6).

- Cool neutral canvas (`#f5f7fb` / `#0d0e12`), white or graphite cards, hairline borders.
- Blue is used sparingly: solid only on the primary button and checked controls; otherwise as text (links) or as a 2 px indicator (focus, nav, active cell).
- No gradients, glows, background patterns, glass, gradient text or hover lift in product UI.
- Overview may use larger numbers and simple charts, but follows the same surface rules as every other page.
- **Brand: preserve and refine.** The AutoCore blue hue and logo stay. Light theme splits *brand* `#0a73f2` (logo, chart series 1, marketing) from *interactive* `#0866d6` (buttons, links, focus), because white text on `#0a73f2` is 4.42:1 and fails AA for normal-size text.

### Why blue

Blue was not chosen for convention. It is the only major hue that does not already carry an operational meaning in this product: green means available or done, amber means reserved or waiting, red means error or destructive, teal is AI. An orange or yellow brand (common "automotive" choices) would collide with warning and reserved stock, which users scan for constantly. The blue also has existing equity across web, mobile, desktop icons and PDF documents, so refining its lightness keeps recognition at no rebranding cost.

---

## 3. Colour system

Exact values are the source of truth in `packages/design-tokens/src/colors.ts`. The tables below show the target palette; changes from today are marked.

### 3.1 Foundation

| Token | Light | Dark | Usage | Status |
| --- | --- | --- | --- | --- |
| `brand` | `#0a73f2` | `#4d96ff` | Logo, chart series 1, marketing accents. Not for text on white. | **New** (value exists as today's `primary`) |
| `background` | `#f5f7fb` | `#0d0e12` | App canvas behind cards and grids | Keep |
| `sidebar` (secondary background) | `#eef2f7` | `#12141a` | Sidebar, top bar chrome | Keep |
| `card` / `surface` (primary surface) | `#ffffff` | `#1a1c24` | Cards, panels, grid body, inputs on cards | Keep |
| `popover` / `surface-elevated` | `#ffffff` | `#22242e` | Menus, popovers, dialogs, toasts | **Change** (dark `popover` is `#1a1c24` today) |
| `muted` (subtle surface) | `#f1f4fa` | `#20222b` | Hover rows, table header, footer strips, skeletons | **Change** (dark `muted` equals `card` today, so hover is invisible) |
| `foreground` (primary text) | `#11131a` | `#f5f5f7` | Titles, body, cell values | Keep (18.55:1 / 15.61:1 on card) |
| `muted-foreground` (secondary text) | `#5a606c` | `#a8acb8` | Meta, helper, column headers, placeholders | Keep (6.32:1 / 7.49:1 on card) |
| Muted text (tertiary) | — | — | Not a separate token. Use `muted-foreground` with smaller size; do not invent a lighter gray. | Keep |
| `border` | `rgba(17,19,26,0.10)` | `rgba(255,255,255,0.08)` | Card outline, dividers, grid lines (decorative) | Keep |
| `border-muted` (divider) | `rgba(17,19,26,0.06)` | `rgba(255,255,255,0.04)` | Row separators inside lists | Keep |
| `input` (control boundary) | `#868b95` | `#6b7080` | Input, select, checkbox borders | **Change** from `rgba(…,0.12)` (1.29:1) to 3.42:1 light / 3.44:1 dark on card |
| `ring` (focus) | `#0866d6` | `#66b8ff` | 2 px focus ring | **Change** (light was `#66b8ff`, 2.13:1) |

### 3.2 Interactive states

| Token | Light | Dark | Notes |
| --- | --- | --- | --- |
| `primary` | `#0866d6` | `#4d96ff` | **Change** light. White text 5.41:1; dark ink `#0d0e12` 6.54:1 |
| `primary-foreground` | `#ffffff` | `#0d0e12` | Keep |
| `primary-hover` | `#0758bd` | `#66b8ff` | **Change** light. 6.69:1 / 9.06:1. Use this token; never `bg-primary/80` |
| `primary-pressed` | `#064ca3` | `#3390f0` | **Change** light. 8.17:1 / 5.87:1 |
| Primary disabled | `primary` at `opacity: 0.5`, `cursor: not-allowed` | same | Exempt from contrast; keep the label readable |
| `secondary` | `#eef2f7` | `#22242e` | **Change** dark (was `#14161e`, darker than a card) |
| `secondary-hover` | `#e3e8ef` | `#2a2d38` | **New**. Text 15.07:1 / 12.60:1 |
| `secondary-foreground` | `#11131a` | `#f5f5f7` | Keep |
| Link | `primary` | `primary` | 5.41:1 on card, 5.04:1 on canvas (light); 5.76:1 on card (dark). Underline on hover and always inside body text |
| Selected nav item | bg `primary-subtle` `#e2eefd` / `#202b3e`, text `primary-on-subtle` `#0a5fc4` / `#4d96ff`, 2 px left indicator `primary` | | **Change**. Text 5.19:1 / 4.82:1; indicator 4.81:1 / 6.24:1 against sidebar |
| Selected table row / grid range | `grid-selection` `#e7f1fe` / `#23324a` | | **New**. Body text 16.27:1 / 11.86:1, muted text 5.54:1 / 5.69:1 |
| Active grid cell | 2 px inset `grid-active-border` `#0866d6` / `#4d96ff` | | **New**. 4.74:1 / 4.38:1 against the selection fill |
| Input focus | border `ring` + 2 px ring `ring`, offset 0 | | **Change** |
| Input invalid | border `danger` (`#d4292e` / `#ff6166`), message in `danger-on-subtle` text colour, `aria-invalid="true"` | | Border 5.05:1 / 5.79:1 |
| Input valid | No green border. Success is shown only after a save, not per field. | | **Change** in principle |

### 3.3 Semantic tones

Every tone keeps the existing four-part contract. Text and icons on a white card use the `on-subtle` value, never the solid fill (solid success `#26b34a` is 2.75:1 on white).

| Tone | Solid fill | Text / icon (`*-on-subtle`) | Background (`*-subtle`) | Border | Fill content |
| --- | --- | --- | --- | --- | --- |
| Success | `#26b34a` / `#40d168` | `#0f7a35` / `#40d168` | `#e5f6e9` / `#1f322c` | `#c2eacc` / `#26563a` | `#11131a` / `#0d0e12` |
| Warning | `#f0a500` / `#ffc94d` | `#8a5a00` / `#ffc94d` | `#fdf4e0` / `#353129` | `#fbe6b8` / `#635331` | `#11131a` / `#0d0e12` |
| Danger / destructive | **`#d4292e`** / `#ff6166` | `#c02626` / `#ff6166` | `#fde7e7` / `#35242c` | `#f9c7c7` / `#633239` | `#ffffff` / `#0d0e12` |
| Info | `primary` | `#0a5fc4` / `#4d96ff` | `#e2eefd` / `#202b3e` | `#bad8fb` / `#2a436a` | `primary-foreground` |
| Neutral | `#5a606c` / `#9498a4` | `#3d424c` / `#c4c7d0` | `#eef0f4` / `#22242e` | `#d5d8e0` / `#3a3d48` | `#ffffff` / `#0d0e12` |
| AI | `#0f766e` / `#2dd4bf` | `#0f5c56` / `#2dd4bf` | `#e0f2f1` / `#1a2e2c` | `#b2dfdb` / `#2a4a46` | `#ffffff` / `#0d0e12` |

- Danger light fill changes from `#eb3838` (4.07:1 with white) to `#d4292e` (5.05:1). Dark is unchanged.
- **Neutral** is today's `offline` family under a meaning-based name; `offline` remains as an alias for sync state. **Info** reuses the primary subtle family; there is no separate info hue.
- `destructive` stays as an alias of `danger` for shadcn compatibility. Do not give them different values.
- Contrast of `*-on-subtle` on `*-subtle` is already enforced by `npm run tokens:check` (4.82–9.14:1).

### 3.4 Charts

`chart-1` = `brand`. In light theme, `chart-2` (`#26b34a`, 2.75:1) and `chart-3` (`#f0a500`, 2.08:1) are below 3:1 against the card. Either darken the light series to `#1f9d42` (3.52:1) and `#b77800` (3.68:1), or never rely on those marks alone (direct labels, tooltips, data table). Recommended: darken.

### 3.5 Domain status colours

AutoCore does **not** need one hue per status. Five tones plus an icon and a text label distinguish every real status. Colour signals the class of state; the label carries the exact state.

| Domain (source) | Status | Label RU / EN (existing copy) | Tone | Icon |
| --- | --- | --- | --- | --- |
| Engine / used part availability (`motor.ts`, `used-part.ts`) | `available` | В наличии / In stock | Success | `CircleCheck` |
| | `reserved` | Резерв / Reserved | Warning | `Bookmark` |
| | `sold` | Продано / Sold | Neutral | `HandCoins` |
| | `installed` | Установлен / Installed | Neutral | `Wrench` |
| | `scrapped` | Списано / Scrapped | Neutral | `Recycle` |
| Engine intake (`motor.ts`) | `draft` | Черновик | Neutral | `CircleDashed` |
| | `intake_in_progress` | Документируют (filter label) | Info | `CircleDot` |
| | `awaiting_verification` | На проверке (filter label) | Warning | `Clock` |
| | `quarantine` | Карантин / Quarantine | Danger | `ShieldAlert` |
| | `rejected` | Not implemented as a label | Danger | `CircleX` |
| Work order (`work-order.ts`) | `draft` | Черновик | Neutral | `CircleDashed` |
| | `confirmed` | Подтверждён | Info | `CircleArrowRight` |
| | `in_progress` | В работе | Info | `CircleDot` |
| | `waiting_parts` | Ждём запчасти | Warning | `PackageSearch` |
| | `completed` | Готов | Success | `CircleCheck` |
| | `delivered` | Выдан | Neutral | `CarFront` |
| | `cancelled` | Отменён | Neutral | `Ban` |
| Payroll (`payroll-transaction.ts`) | `pending` / `paid` / `cancelled` | К выплате / Выплачено / Не выплачивать | Warning / Success / Neutral | `Clock` / `CircleCheck` / `Ban` |
| Import job | queued, analyzing, applying | В очереди, Анализ, Применение | Info | `LoaderCircle` (animated only while running) |
| | completed | Завершён | Success | `CircleCheck` |
| | failed | Ошибка | Danger | `CircleAlert` |
| | rolled back, cancelled | Откачен, Отменён | Neutral | `Undo2`, `Ban` |
| Sync (`persistence-status-badge.tsx`) | clean / dirty / saving / offline / error / conflict | existing copy | Success / Warning / Info / Neutral (`offline`) / Danger / Danger | `CircleCheck` / `CircleDot` / `LoaderCircle` / `CloudOff` / `CircleAlert` / `TriangleAlert` |

All icon names in this table were verified as canonical exports of `lucide-react@1.16.0`.

Rules:
- `cancelled`, `sold`, `delivered` are **neutral**: they are closed outcomes, not errors. Red is reserved for errors, rejections, blocked stock and destructive actions.
- Statuses always render as **text + tone**; icons are added where the label may be truncated or in compact grid cells.
- One registry per entity (`status → { tone, icon, labelKey }`) feeds one `StatusBadge`. The list and the detail view read the same registry.

### 3.6 Theme rules

- Both themes ship (`next-themes`, `class` strategy, system default). Every colour comes from a token; a raw palette class (`text-emerald-700`) is a defect.
- Dark mode elevates with fill (`background` → `card` → `popover`), not shadow.
- Hover on any surface uses `muted` (now distinct from `card` in dark).
- `<meta name="theme-color">` uses `background` (`#f5f7fb` / `#0d0e12`).
- Images and PDF previews keep a white page in dark mode; frame them with `border`.

---

## 4. Typography

**Family:** Geist Sans (variable, already loaded with `latin` + `cyrillic`) for all UI. Geist Mono for identifiers only; add the `cyrillic` subset (the font contains Cyrillic; the app loads only `latin`). Fallbacks: `ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif` and `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`. No other families in product UI.

**Variable font:** yes. Use weights 400, 500, 600 only.

### 4.1 Scale

| Token | Size / line | Weight | Tracking | Use |
| --- | --- | --- | --- | --- |
| `title-page` | 20 / 28 px (18 / 28 below 768 px) | 600 | −0.01em | One `<h1>` per page (top bar title) |
| `title-section` | 16 / 24 | 600 | −0.005em | `<h2>`: dialog title, section, sheet title |
| `title-card` | 14 / 20 | 600 | 0 | `<h3>`: card and panel titles |
| `body` | 14 / 20 | 400 | 0 | Default UI text, table cells in `ui/table` |
| `body-strong` | 14 / 20 | 500 | 0 | Labels, nav items, emphasised values |
| `grid` | 13 / 18 | 400 / 500 | 0 | Excel-grid cells (formalises today's `text-[13px] leading-[1.35]`) |
| `caption` | 12 / 16 | 400 / 500 | 0 | Helper text, column headers, badges, timestamps, meta |
| `micro` | 11 / 14 | 500 | 0 | Only `Kbd`, count bubbles, and grid headers at compact density |
| `metric` | 24 / 32 | 600 | −0.01em | KPI values (tabular) |
| `metric-sm` | 18 / 28 | 600 | 0 | Secondary KPI values (tabular) |
| `input` | 16 px below 768 px, 14 px above | 400 | 0 | Prevents iOS zoom (keep current `text-base md:text-sm`) |

Rules:
- Nothing below 11 px. Remove `text-[9px]` and `text-[10px]` (55 product usages).
- Sentence case everywhere. **No uppercase** labels except unit codes (`USD`, `KZT`, `VIN`, `SKU`) and keyboard keys.
- No positive letter-spacing on Cyrillic text.

### 4.2 Numbers and identifiers

| Content | Rule |
| --- | --- |
| Quantities, prices, totals, percentages | `font-variant-numeric: tabular-nums` (Geist Sans has `tnum`, verified), right-aligned in tables and grids, same decimals within a column |
| Money | Amount and currency are separate spans: `1 250 000` + muted `₸`. Geist has no `₸` glyph, so the symbol renders from a fallback; keeping it in its own span stops it from shifting digit alignment. Negative values use the minus sign `−` and the danger text colour, never colour alone |
| Dates | Fixed format per locale (`10.10.2026` ru, `Oct 10, 2026` en); tabular; relative time ("5 min ago") only in activity feeds, with absolute time in `title` |
| Serial, engine code, VIN, SKU, barcode, location code, document numbers | Geist Mono, `body`/`grid` size, weight 500, **never truncated** and never translated; allow wrap or widen the column; provide a copy button on detail views |
| Row numbers | Muted, tabular, centred (the only centred numbers) |

### 4.3 Truncation and wrapping

- Names (customer, brand, notes): single-line `truncate` with the full value in a tooltip; two-line clamp in cards.
- File names: truncate in the middle (keep extension).
- Identifiers and numbers: never truncate.
- Page titles: truncate in the top bar, full in `<title>`.
- Notes and long text in grids: one line with an expand affordance; full text in the editor overlay.

---

## 5. Iconography

**Library:** Lucide (`lucide-react@1.16.0`), the only icon library in the project. No replacement: Lucide covers every recurring action, matches shadcn, and auto-hides decorative icons from assistive tech. Lucide has no engine or gearbox glyph; draw those two with `createLucideIcon` on the 24 px grid with the same stroke (product-owner decision).

| Rule | Spec |
| --- | --- |
| Sizes | 12 px (inside badges), 14 px (dense rows, `sm` buttons), **16 px default** (buttons, nav, inputs), 20 px (empty states, page header). No other sizes in product UI |
| Stroke | 1.75 globally via `LucideProvider strokeWidth={1.75}`; 2 for icons ≤ 14 px. Do not set per-icon stroke widths (18 different values today) |
| Names | Canonical names only (`LoaderCircle`, not `Loader2`/`Loader2Icon`). No `…Icon` suffix |
| Colour | `currentColor`. Default icon colour is `muted-foreground`; inside buttons and nav it inherits the text colour; status icons use the tone's `on-subtle` colour |
| Alignment | Centre on the text's x-height box with `inline-flex items-center`; gap 6 px (`gap-1.5`) at 14 px text, 8 px at 16 px |
| Navigation | Every sidebar item has an icon (needed for the collapsed rail). One meaning per glyph across the product |
| Buttons | Leading icon only when it speeds recognition (Add, Import, Export, Print, Scan). Text-only for Save, Cancel, Confirm |
| Icon-only | Allowed only for universal toolbar actions (close, more, search, zoom, sidebar toggle, column settings). Must have `aria-label` and a tooltip with the same text |
| Status | Icon + text; never icon alone except in a compact grid cell where the column header names the state |
| Destructive | `Trash2` plus the word ("Удалить"); never colour alone. `Trash2` is never a navigation icon |
| Don't | Emoji, Unicode symbols as icons (`+` in `contact-experience.tsx` is marketing), decorative icon wells, `Sparkles` for anything other than AI |

The full mapping for every navigation item and recurring action is in [AUTOCORE_ICON_AND_COPY_AUDIT.md](./AUTOCORE_ICON_AND_COPY_AUDIT.md) §3.

---

## 6. UI copy conventions

Russian is the primary product language; English is the source language for keys. These rules are design-system rules; individual translations follow [I18N-TERMINOLOGY.md](./I18N-TERMINOLOGY.md).

| Topic | Rule | Example |
| --- | --- | --- |
| Voice | Direct, neutral, professional. No "we" in status labels | «Ожидание запчастей», not «Ждём запчасти» |
| Case | Sentence case for everything, including buttons and headers | «Новый заказ-наряд» |
| Buttons | Verb + object; Russian infinitive | «Продать двигатель», «Сохранить изменения», «Удалить 3 позиции» |
| Primary vs secondary | Primary names the commitment; secondary is «Отмена» / "Cancel" | — |
| Forbidden generic labels | "Submit", "OK", "Process", "Manage", «Готово» as a confirm button, «Обработать» | — |
| Page titles | Noun, matches the nav label exactly | «Заказ-наряды» |
| Form labels | Noun phrase, no colon; required fields marked in the label, not by colour | «Код двигателя» |
| Placeholders | Example format, never the label | «Например, G4KD» |
| Helper text | One sentence, below the field, `caption` | — |
| Validation | What is wrong + how to fix, next to the field | «Введите серийный номер: 6–17 символов» |
| Loading | Noun form + ellipsis character `…` | «Загрузка…», «Сохранение…» (never «Сохраняем…», never `...`) |
| Upload vs load | Upload = «Отправка файла…»; loading data = «Загрузка…» | — |
| Success toast | Past tense, object, optional count | «Двигатель продан», «Импортировано 120 строк» |
| Failure toast | «Не удалось» + action + reason/next step | «Не удалось сохранить. Проверьте соединение и повторите» |
| Destructive dialog | Title as a question with the object and count; body states the consequence; confirm repeats the verb | «Удалить 12 двигателей?» / «Записи и фото будут удалены без возможности восстановления.» / [Удалить 12 двигателей] |
| Empty state | What this place is for + the first action | «Двигателей пока нет» + «Добавить двигатель» / «Импортировать» |
| Tooltips | The same text as the `aria-label`; add the shortcut in a `Kbd` | «Сканер штрихкода ⌘B» |
| Search | Placeholder names searchable fields | «Код, серийный номер, бренд» |
| Table headers | Short nouns, compact glossary forms allowed (`Закупка`) | — |
| Numbers in text | No-break space between number and unit; grouping per decision in audit §7 | «12 шт.» |
| Internal names | Never show code names ("Motors Grid", "heartbeat", "rolled_back") | — |
| Dashes | Pending product decision (audit §7.9). Until then: no em-dash in labels, buttons, toasts; allowed in long-form help text | — |

---

## 7. Components

Dimensions use Tailwind's default 4 px spacing scale (`--spacing: 0.25rem`). Radii use the existing `--radius: 0.625rem` scale (`sm` 6, `md` 8, `lg` 10, `xl` 14 px).

### 7.1 Buttons (`ui/button.tsx`)

| Size | Height | Padding x | Text | Icon | Use |
| --- | --- | --- | --- | --- | --- |
| `xs` | 24 | 8 | 12 / 500 | 12 | Inline in grid rows, badges row |
| `sm` | 28 | 10 | 13 / 500 | 14 | Toolbars, dense panels |
| `default` | 32 | 12 | 14 / 500 | 16 | Default desktop |
| `lg` | 36 | 14 | 14 / 500 | 16 | Dialog footers, page header primary, forms |
| `icon-*` | equal width and height to the size above | — | — | as above | Icon-only |

| Variant | Default | Hover | Pressed | Focus | Disabled |
| --- | --- | --- | --- | --- | --- |
| `default` (primary) | `primary` / `primary-foreground` | `primary-hover` | `primary-pressed`, `translate-y-px` | 2 px `ring` with 2 px offset | 50 % opacity |
| `secondary` | `secondary` | `secondary-hover` | same | ring | 50 % |
| `outline` | `card` bg, `input`-strength border | `muted` bg | same | ring | 50 % |
| `ghost` | transparent | `muted` | same | ring | 50 % |
| `destructive` (soft) | `danger-subtle` / `danger-on-subtle` / `danger-border` | border becomes `danger` (background unchanged; a `danger-border` fill would drop text to 3.95:1) | same | ring in `danger` | 50 % |
| `destructive-solid` **New** | `danger` / `danger-foreground` | `danger-hover` (`#b92226` light 6.33:1, `#ff7a7e` dark 7.66:1) | same | ring offset | 50 % |
| `link` | `primary` text, underline on hover | — | — | ring | 50 % |

Rules: radius `lg` (10 px). One `default` per region. `destructive-solid` only inside a destructive confirmation dialog. Loading state keeps width, swaps the leading icon for `LoaderCircle`, sets `aria-busy`. On coarse pointers (`@media (pointer: coarse)`) all buttons have `min-height` and `min-width` 40 px.

### 7.2 Inputs and textareas

Height 32 px (desktop), 40 px on coarse pointers; padding x 10 px; radius `lg`; background `card` (not transparent, so the boundary is clear); border `input`; text `body` (16 px below 768 px). Focus: border and 2 px ring `ring`. Invalid: border `danger`, ring `danger` at 25 %, message below in `danger-on-subtle` with `CircleAlert` 14 px, connected by `aria-describedby`. Disabled: `muted` background, 50 % text opacity. Read-only: no border, `muted` background. Textareas: min 64 px, `field-sizing: content`, max 240 px then scroll.

### 7.3 Selects, comboboxes, dropdowns

Trigger matches Input exactly (height, border, radius). Chevron `ChevronDown` 16 px muted. Popup: `popover` surface, 1 px `border`, shadow `md`, radius `lg`, item height 32 px, padding x 8 px, selected item shows `Check` at the end, highlighted item `muted`. Max height 320 px with scroll. Searchable lists (`search-combobox`, `datalist-input`) put the search input first and announce result counts.

### 7.4 Checkboxes and switches (New primitives)

Today 9 product files use native `type="checkbox"` and there is no switch. Add `ui/checkbox.tsx` and `ui/switch.tsx` on Base UI.
- Checkbox 16 px box (hit area 24 px), radius 4 px, border `input`, checked fill `primary` with white `Check` 12 px, indeterminate `Minus`.
- Switch 32 × 18 px track, `muted`/`primary`; only for settings that apply immediately. Use a checkbox when a Save button commits the change.

### 7.5 Tabs (`ui/tabs.tsx`)

Two variants exist; keep both with fixed roles:
- `default` (segmented): switches views of the same data (e.g. availability All / In stock / Sold in the top bar). Height 32 px, inactive text `muted-foreground` (today `foreground/60`, 4.69:1 on `muted`, acceptable), active `card` fill.
- `line`: page-level sections. Active indicator 2 px `primary` (today `foreground`).
Max 6 tabs; overflow scrolls horizontally with edge fade.

### 7.6 Cards and panels

`card` background, 1 px `border`, radius `xl` (14 px), padding 16 px (12 px for `size="sm"`), no shadow, no hover lift. Card header: `title-card` + optional `caption` description + one action at the end. Do not nest cards. Clickable cards: whole card is a link, hover `muted` border shift only, focus ring. Replace `mc-*` card styles with this spec.

**KPI tile** (merge `ui/kpi-card`, `accounting/metric-card`, `overview/mc-stat-card` into one): label `caption` sentence case in `muted-foreground`; value `metric` tabular; delta via `ui/delta` with sign and arrow icon plus colour; period in the label ("За 30 дней"). No icon wells.

### 7.7 Tables and data grids

Two table types exist; both follow the same visual rules.

| Spec | Excel grids (engines, warehouse, catalog) | `ui/table` (lists, history, payroll) |
| --- | --- | --- |
| Row height | 30 px base × density scale (`compact` 0.92 → ≈28 px) (existing `MOTOR_GRID_BASE_ROW_HEIGHT`) | 40 px default, 32 px compact |
| Header height | 28 px base (existing) | 36 px |
| Cell padding x | 10 px (existing `px-2.5`) | 12 px first/last column, 8 px between |
| Text | `grid` 13 / 18 | `body` 14 / 20 |
| Header | `caption` 12 / 500, `muted-foreground`, sentence case, **sticky**, `muted` background, bottom `border` | same |
| Numeric columns | Right-aligned, tabular, header right-aligned | same |
| Identifier columns | Mono 500, never truncated | same |
| Grid lines | `border` vertical and horizontal | horizontal `border-muted` only |
| Hover | `muted` row background (non-grid) | `muted` |
| Selection | `grid-selection` fill, active cell 2 px `grid-active-border` inset | Leading 32 px checkbox column, row `grid-selection` |
| Pinned columns | `card` background, right edge shadow token `shadow-pin` only while scrolled (existing behaviour) | First column sticky on narrow screens |
| Sorting | Header button with `ArrowUpDown` (unsorted, muted) → `ArrowUp`/`ArrowDown` (primary); `aria-sort` on the header | same |
| Row actions | Context menu + a trailing `Ellipsis` ghost icon button; "Sell/Return" as ghost text buttons or menu items, not coloured chips | trailing `Ellipsis` |
| Status cells | `StatusBadge` compact (icon + short label) | `StatusBadge` |
| Overflow | Horizontal scroll inside the grid viewport; page never scrolls sideways | `overflow-x-auto` container |
| Empty | One-line empty row with action in the grid body; full empty state only when the dataset is empty | Empty state in place of the table |
| Accessibility | WAI-ARIA grid pattern (audit C2) | Native `<table>` semantics, `<caption>` or `aria-label` |

Density: keep the existing width-driven bands; a user density toggle may later scale row height (28 / 30 / 34), never font size.

### 7.8 Dialogs, alert dialogs and sheets

- **Dialog:** `popover` surface, radius `xl`, padding 16 px (24 px ≥ 640 px), widths 400 / 560 / 720 px, overlay `overlay` token (today `bg-black/10`, too faint to separate in light theme). Title `title-section`; footer right-aligned, primary last. Close button `X` with localized `aria-label` (today hard-coded "Close").
- **Alert dialog (New):** for destructive or irreversible actions (delete, rollback import, clear data, cancel work order). No close icon; Escape = Cancel; initial focus on **Cancel**; confirm button `destructive-solid` with the verb and object; type-to-confirm (company name) for company-wide wipes in Settings → Data clean-up. Replaces native `confirm()`/`alert()`.
- **Sheet (drawer):** right side, 400–560 px, for record detail and filters; full width below 640 px. Same header/footer anatomy as Dialog.

### 7.9 Tooltips

`foreground` background with `background` text (18.55:1), 12 px, radius `md`, max width 280 px, delay 400 ms on first show (today `delay = 0`), 0 ms when moving between triggers. Never the only place for essential information; never on disabled elements without a focusable wrapper.

### 7.10 Toasts (`ui/sonner.tsx`)

Bottom-right, 360 px wide, `popover` surface, 1 px `border`, shadow `lg`, radius `xl`. Tone is shown by icon (success `CircleCheck` in `success-on-subtle`, error `CircleAlert` in `danger-on-subtle`, info `Info` in `primary-on-subtle`) and an optional 3 px left bar in the tone colour, not by tinting the whole toast. Durations: success 4 s, info 6 s, error persistent until dismissed when it requires action. Toasts with an "Undo" action are preferred over confirmations for reversible actions. Errors that block a form appear inline, not as toasts.

### 7.11 Badges and status indicators

- `StatusBadge` (New, wraps `Badge`): height 20 px, padding x 6 px, radius `sm` (6 px, rectangular so it is not mistaken for an interactive pill), text `caption` 12 / 500, tone tokens, optional 12 px icon or 6 px dot. In grids use the compact form (icon + label at 12 px).
- Count badges: `micro` text, `muted` background, min width 18 px.
- Pills (`rounded-full`) are reserved for interactive filter chips.

### 7.12 Pagination

Not implemented anywhere today, and grids are virtualised. Keep it that way: grids show the total row count in the status bar; long server lists (activity log, imports history) use "Показать ещё" with "N из M". Add a pagination component only if a server-paged table appears.

### 7.13 Search and filtering

- Global: top-bar `WorkspaceSearchField` (max 512 px) + command palette (`cmdk`) on ⌘K / Ctrl+K. Placeholder names fields.
- Grid filters: availability segmented control (existing), brand/engine filters in the sidebar context panel (existing). Active filters appear as removable chips above the grid with a "Сбросить фильтры" link; count of results visible.
- Filter icon: `ListFilter`. Search icon: `Search`, muted, leading.
- Keyboard: `/` focuses search where no text input is focused; Escape clears then blurs.

### 7.14 Sidebar and top bar

- Sidebar: `sidebar` background, item height 32 px, padding x 12 px, icon 16 px, gap 10 px, text `body-strong` in `sidebar-foreground`. Section labels: `caption` 12 / 500 sentence case, `muted-foreground` (replace 11 px uppercase). Active item per §3.2 with a 2 px left indicator and `aria-current="page"`. Collapsed rail shows icons with tooltips.
- Top bar: 56 px high (`h-14`, existing; min 52 px below 768 px), title as `<h1>` `title-page`, centre slot for search or view tabs, right slot ≤ 4 icon buttons plus overflow menu. Icon buttons need `aria-label` (not `title` only).

### 7.15 Forms and validation

- Use `Field` / `FieldGroup` (today 3 files) for every new or touched form: label above input, helper below, error replaces helper.
- Validate on blur and on submit, not on every keystroke; on submit, focus the first invalid field and show an inline summary at the top for forms longer than one screen.
- Required: «обязательно» suffix in the label or an asterisk with a legend; never colour alone.
- Group with `title-section` headings; 16 px between fields, 24 px between groups; max form width 640 px.
- Primary button at the end of the form (and sticky footer in sheets).

### 7.16 Empty, loading and disabled states

- **Empty:** one component (merge `ui/empty` and `ui/empty-state`). 20 px muted icon (no coloured well), `title-card`, one-sentence `body` description, one primary action and one secondary. Distinguish "no data yet" from "no results for these filters" (the latter offers "Сбросить фильтры").
- **Loading:** skeletons that match the final layout for pages and grids (rows of 30 px bars); spinner (`LoaderCircle` 16 px) only inside buttons and for operations under 2 s. Skeleton fill `muted`, pulse disabled under reduced motion.
- **Long operations** (import, PDF generation): progress bar with percentage or step text and a cancel action (existing `import-progress-host`).
- **Disabled:** 50 % opacity, `cursor: not-allowed`, and a tooltip on a wrapper explaining why when the reason is not obvious (permissions, plan limits).

---

## 8. Accessibility requirements

| Requirement | Target | Status |
| --- | --- | --- |
| Text contrast | 4.5:1 normal, 3:1 for ≥ 24 px or ≥ 18.67 px bold | Fails in several places (audit C1). Enforce through tokens + `tokens:check` with no waivers |
| Non-text contrast | 3:1 for input borders, focus indicators, status icons, chart marks | Fails today (audit H3, M4, L3) |
| Focus visible | 2 px solid `ring`, offset 2 px, on every interactive element | Change |
| Keyboard | Every menu, dialog, tab, combobox via Base UI; grids keep existing keyboard engine plus ARIA grid semantics | Grids missing semantics (audit C2) |
| Names | `aria-label` on icon-only controls; dialog titles; one `<h1>` per page | Partly missing (audit H7, M7) |
| Status | Text label always; icon in compact cells; colour never alone | Change |
| Motion | Honour `prefers-reduced-motion` (mostly done); no motion over 320 ms in product UI; no infinite animation except active progress | Keep / tighten |
| Target size | ≥ 24 × 24 px everywhere (WCAG 2.5.8); ≥ 40 × 40 px on coarse pointers | Partly (mobile CSS sets height only) |
| Zoom | Layout works at 200 % zoom and 320 px width without page-level horizontal scroll; grids scroll internally | Not verified (no rendered testing) |
| Language | `<html lang>` server-rendered from the account locale | Change (audit L5) |
| Forms | `aria-invalid`, `aria-describedby` for errors, error summary | Change |

Verification still required: screen-reader pass (NVDA + Firefox, VoiceOver + Safari) on the engine grid and a work-order flow, keyboard-only pass of sell / return / delete, 200 % zoom pass, and an automated axe run per route.

---

## 9. Motion

| Use | Duration | Easing |
| --- | --- | --- |
| Hover, colour, focus | 120 ms | `ease-out` |
| Menus, popovers, tooltips | 160 ms | `cubic-bezier(0.22, 1, 0.36, 1)` (existing AutoCore ease) |
| Dialogs, sheets, sidebar collapse | 240 ms (sidebar keeps its 280 ms) | same |
| Page enter | 200 ms opacity only | `ease-out` |

No hover lift, no shake except for a failed sign-in, no decorative pulsing. Under reduced motion: opacity only, ≤ 120 ms.
