# AutoCore Icon and Copy Audit (Web Product)

**Date:** 2026-10-10 · **Scope:** `src/` (web dashboard; marketing excluded unless stated).
**Related:** [AUTOCORE_DESIGN_AUDIT.md](./AUTOCORE_DESIGN_AUDIT.md) (findings M1, H5, H6, M7, L4) · [AUTOCORE_DESIGN_LANGUAGE.md](./AUTOCORE_DESIGN_LANGUAGE.md) §5–6 · [I18N-TERMINOLOGY.md](./I18N-TERMINOLOGY.md)

**Verification method.** Icon names were checked against the pinned `lucide-react@1.16.0` package (the version in `package-lock.json`): every name in the "Recommended" columns below resolves to a **canonical** export (not a deprecated alias). Current-text examples were copied from the files and lines cited; nothing in the "Current" columns is invented. Where no text exists, the cell says "Not implemented".

---

## 1. Existing icon inventory [FACT]

| Metric | Value |
| --- | --- |
| Icon libraries imported in `src/` | 1 (`lucide-react`) |
| Files importing Lucide | 259 |
| Icon imports | 838 |
| Unique imported names | 238 |
| Imports using a deprecated legacy name | 88 (10.5 %), 21 distinct names |
| Imports using the `…Icon` suffix form | 89 (10.6 %) |
| `LucideProvider` usage | none |
| Distinct `strokeWidth` values in TSX | 18 (0 – 4.25; includes some non-Lucide SVGs) |
| Icon size classes (top) | `size-4` ×300, `size-3.5` ×160, `size-3` ×47, `size-5` ×26, `size-6` ×13, `size-2.5` ×11, `size-8` ×11 |

### 1.1 Most used icons

| Icon (as imported) | Imports | Canonical name |
| --- | --- | --- |
| `Loader2` | 36 | `LoaderCircle` |
| `Sparkles` | 27 | `Sparkles` |
| `Plus` | 25 | `Plus` |
| `Package` | 22 | `Package` |
| `Check` | 22 | `Check` |
| `FileText` | 21 | `FileText` |
| `Search` | 19 | `Search` |
| `X` | 18 | `X` |
| `Users` | 17 | `Users` |
| `ArrowRight` | 16 | `ArrowRight` |
| `Trash2` | 14 | `Trash2` |
| `ClipboardList` | 14 | `ClipboardList` |
| `Download` | 14 | `Download` |
| `CheckCircle2` | 13 | `CircleCheck` |
| `Wallet`, `MapPin`, `ChevronRight`, `Smartphone`, `AlertTriangle` | 11 each | `AlertTriangle` → `TriangleAlert` |

### 1.2 Same glyph, several names (migrate to the canonical name)

| Canonical | Imported as (count) |
| --- | --- |
| `LoaderCircle` | `Loader2` (36), `Loader2Icon` (2), `LoaderCircle` (2) |
| `CircleCheck` | `CheckCircle2` (13) |
| `CircleCheckBig` | `CheckCircleIcon` (1) — a **different** success glyph from `CircleCheck`; standardise on `CircleCheck` |
| `TriangleAlert` | `AlertTriangle` (11), `TriangleAlert` (1) |
| `CircleAlert` | `AlertCircle` (2), `CircleAlert` (1) |
| `CircleX` | `CircleX` (2), `XCircle` (1) |
| `CircleQuestionMark` | `CircleHelp` (2), `HelpCircle` (2) |
| `Ellipsis` | `MoreHorizontal` (2), `EllipsisIcon` (2), `Ellipsis` (1), `MoreHorizontalIcon` (1) |
| `CircleUser` | `UserCircle` (4) |
| `ChartColumn` | `BarChart3` (3) |
| `ChartPie` / `ChartLine` | `PieChart` (1) / `LineChart` (1) |
| `House` | `Home` (1), `HomeIcon` (1) |
| `CircleMinus` | `MinusCircle` (1) |
| `CloudUpload` | `UploadCloud` (1) |
| `FilePlusCorner` | `FilePlus2` (1) |
| `MessageCircleQuestionMark` | `MessageCircleQuestion` (1) |
| `X`, `Plus`, `Check`, `Search`, `ChevronDown`, `ChevronRight`, `FileText`, `Users`, … | mixed bare and `…Icon` forms (e.g. `X` 18 / `XIcon` 5, `ChevronDownIcon` 5 / `ChevronDown` 4) |

### 1.3 Meaning conflicts

| Glyph | Meanings today | Evidence |
| --- | --- | --- |
| `Package` | Inventory (parent nav), Consumables (child nav), warehouse quick action | `business-navigation.ts:60,99`; `quick-actions-panel.tsx:51` |
| `Settings2` | Transmissions (nav), Columns (top bar, specific sheets) | `business-navigation.ts:58`; `dashboard-top-bar.tsx:399`; `specific-records-workspace.tsx:189` |
| `Cog` vs `Settings` | Engines vs account Settings: two gears in one sidebar | `business-navigation.ts:57`; `sidebar-user-menu.tsx`, `account-menu.tsx` |
| `Wallet` | My earnings (nav) and "expense" quick action | `business-navigation.ts`; `quick-actions-panel.tsx:70` |
| `Sparkles` | AI, app configuration, profile name, plan upsell, sale celebration | `settings-shell.tsx:38`, `profile-name-gate.tsx:145`, `plan-comparison-table.tsx:129`, `motor-sale-success-overlay.tsx:70` |
| `Trash2` | Delete action **and** the "Data clean-up" settings nav item | `settings-shell.tsx:41` |
| `CircleDollarSign` | Finance nav and accounting settings, although KZT is a display currency | `business-navigation.ts`; `settings-shell.tsx:40` |
| `Barcode` | A scan *action* (top bar) rather than the code itself | `dashboard-top-bar.tsx:430` |

---

## 2. Library recommendation

**Keep Lucide as the single icon system.** It is already the only library, is the shadcn default declared in `components.json`, has every recurring action AutoCore needs, and v1.16 sets `aria-hidden` on decorative icons automatically. Replacing it (e.g. with Tabler, which has an engine glyph) would touch 259 files for one missing glyph.

Gaps: Lucide 1.16 has **no engine and no gearbox glyph** (searched the full export list). Recommended: draw `EngineBlock` and `Gearbox` with `createLucideIcon` on the 24 px grid, round caps and joins, same stroke as the rest. Until they exist, Engines keeps `Cog` and Transmissions keeps `Settings2`, and the conflicts are removed on the *other* side (Columns → `Columns3Cog`, Settings → `Settings` only).

Global setup: `LucideProvider strokeWidth={1.75}` once in `app-providers.tsx`; remove per-icon `strokeWidth` props.

---

## 3. Recommended icon mapping (all names verified)

### 3.1 Navigation

| Item (route) | Current | Recommended | Reason |
| --- | --- | --- | --- |
| Dashboard / Overview (`/home`) | `LayoutGrid` | `LayoutDashboard` | `LayoutGrid` also means module tiles and grid view |
| Inventory group (`/motors`, `/warehouse`) | `Package` | `Warehouse` | Frees `Package` for Consumables; matches the nav label «Склад» |
| Engines (`?collection=engines`) | `Cog` | custom `EngineBlock` (interim `Cog`) | Lucide has no engine; `Cog` reads as settings |
| Transmissions | `Settings2` | custom `Gearbox` (interim `Settings2`) | `Settings2` is a sliders glyph |
| Parts | `Puzzle` | `Bolt` | `Puzzle` usually means integrations; `Bolt` is hardware. Approve visually |
| Consumables (`/warehouse`) | `Package` | `Package` | Unique once the parent changes |
| Sales (`/sold`) | `Receipt` | `HandCoins` | `Receipt`/`ReceiptText` are needed for invoices |
| Donors (`/donors`) | `Car` | `Car` | Keep |
| Work orders (`/work-orders`) | `ClipboardList` | `ClipboardList` | Keep |
| Finance (`/accounting`) | `CircleDollarSign` | `Coins` | Currency-neutral (USD and KZT) |
| Documents (`/documents`) | `FileText` | `FileText` | Keep |
| My earnings (`/my-earnings`) | `Wallet` | `Wallet` | Keep; use `Banknote` for the expense quick action |
| Team (`/team`) | `Users` | `Users` | Keep |
| Settings | `Settings` | `Settings` | The only gear in the product |
| Settings → Account / Company / Branding | `UserCircle` / `Building2` / `Palette` | `CircleUser` / `Building2` / `Palette` | Canonical name only |
| Settings → App configuration | `Sparkles` | `SlidersHorizontal` | `Sparkles` is reserved for AI |
| Settings → Data clean-up | `Trash2` | `Archive` | A destructive glyph should not be a navigation target |
| AI (`/ai`) | `Sparkles` | `Sparkles` | Only allowed use |
| Help / Status | `HelpCircle` / `Activity` | `CircleQuestionMark` / `Activity` | Canonical name |
| Sidebar toggle | `PanelLeft` | `PanelLeft` | Keep |

### 3.2 Recurring actions

| Action | Recommended | Notes |
| --- | --- | --- |
| Search | `Search` | Leading, muted |
| Filter | `ListFilter` | `Filter` is only a deprecated alias of `Funnel` in v1.16; use `ListFilter` for table filters |
| Sort (none / asc / desc) | `ArrowUpDown` / `ArrowUp` / `ArrowDown` | With `aria-sort` |
| Column settings | `Columns3Cog` | Replaces `Settings2` |
| Add / Create | `Plus` | With label: «Добавить двигатель» |
| Edit | `Pencil` | |
| Delete | `Trash2` | Always with text in menus; icon-only only in dense rows with `aria-label` |
| Export | `Download` (`FileSpreadsheet` when the format matters) | |
| Import | `Upload` | |
| Print / labels | `Printer` | |
| Scan barcode | `ScanBarcode` | Replaces `Barcode` for the action |
| QR | `QrCode` | |
| More actions | `Ellipsis` (`EllipsisVertical` only inside narrow cards) | One choice per context |
| Close | `X` | `aria-label` «Закрыть» |
| Copy | `Copy` | Identifiers on detail views |
| Refresh / sync | `RefreshCw` | |
| Undo / rollback | `Undo2` | Replaces `RotateCcw` for rollback |
| History | `History` | |
| Location | `MapPin` | |
| Stock transfer | `ArrowLeftRight` | |
| Receive / issue stock | `PackagePlus` / `PackageMinus` | |
| Stocktake | `ClipboardCheck` | |
| Photo | `Camera` / `ImagePlus` | |
| External link | `ExternalLink` | |
| Expand / collapse | `ChevronDown` / `ChevronRight` | |
| Select (combobox) | `ChevronsUpDown` | |
| Invite | `UserPlus` | |
| Sign out | `LogOut` | |
| Save | text only | No icon |
| Loading | `LoaderCircle` (animated) | Never `Loader2` |

### 3.3 Status and feedback

| Meaning | Recommended | Colour token |
| --- | --- | --- |
| Success / available / completed / paid | `CircleCheck` | `success-on-subtle` |
| Warning / attention | `TriangleAlert` | `warning-on-subtle` |
| Error / failed | `CircleAlert` | `danger-on-subtle` |
| Rejected | `CircleX` | `danger-on-subtle` |
| Quarantine | `ShieldAlert` | `danger-on-subtle` |
| Info | `Info` | `primary-on-subtle` |
| Draft | `CircleDashed` | `neutral-on-subtle` |
| In progress / intake | `CircleDot` | `primary-on-subtle` |
| Confirmed | `CircleArrowRight` | `primary-on-subtle` |
| Waiting for parts | `PackageSearch` | `warning-on-subtle` |
| Awaiting verification / pending | `Clock` | `warning-on-subtle` |
| Reserved | `Bookmark` | `warning-on-subtle` |
| Sold | `HandCoins` | `neutral-on-subtle` |
| Installed | `Wrench` | `neutral-on-subtle` |
| Scrapped | `Recycle` | `neutral-on-subtle` |
| Delivered (vehicle handed over) | `CarFront` | `neutral-on-subtle` |
| Cancelled | `Ban` | `neutral-on-subtle` |
| Offline | `CloudOff` | `offline-on-subtle` |
| Rolled back | `Undo2` | `neutral-on-subtle` |

All 95+ names in §3 resolve to canonical exports in `lucide-react@1.16.0`.

### 3.4 Icon-only controls missing names [FACT]

| Location | Icon | Fix |
| --- | --- | --- |
| `document-import/document-import-viewer.tsx:132,141` | `ZoomIn`, `ZoomOut` | `aria-label` «Увеличить» / «Уменьшить» + tooltip |
| `document-import/document-import-viewer.tsx:150,159` | `RotateCcw`, `RotateCw` | «Повернуть влево» / «Повернуть вправо» |
| `document-import/document-import-viewer.tsx:178` | `Maximize2` / `Minimize2` | «Развернуть» / «Свернуть» |
| `ai-elements/conversation.tsx:87` | `ArrowDownIcon` | «Прокрутить вниз» |
| `layout/dashboard-top-bar.tsx:419,433` | `Barcode`, `Upload` | `title` only; add `aria-label` with the same text |

---

## 4. Copy inventory: patterns [FACT]

| Pattern | Evidence |
| --- | --- |
| Engine vs Motor | «Мотор»/«Моторы» appears in 92 lines of `user-copy.ru.ts`, including customer-facing titles, while navigation and filters say «Двигатели» |
| Two progress forms for "saving" | «Сохранение…» (lines 11, 20, 2166, 3816, 3823) and «Сохраняем…» (180, 566, 695, 1142, 4318, 4333, 4501) |
| ASCII ellipsis | «Загрузка...» (`user-copy.ru.ts:1244`) vs «Загрузка…» elsewhere |
| «Загрузка» for upload | `uploading: "Загрузка…"` (`user-copy.ru.ts:36`) |
| Generic error label | `errorGeneric: "Ошибка"` (`:3485`), EN `"Error"` (`user-copy.en.ts:3468, 3649, 3681`) |
| Hard-coded English | `engine-intake-detail.tsx:329–385`; `ui/dialog.tsx:78,116`; `ui/spinner.tsx:6` |
| Internal names | «Выпустить в Motors Grid» (`:4424`), «Пульс» for heartbeat (`:4415`) |
| Native browser dialogs | `confirm()` in `warehouse-import-history-panel.tsx:74`, `motor-import-history-panel.tsx:79`; `alert()` in `warehouse-import-dialog.tsx:76` |
| Em-dashes | 159 RU / 143 EN copy lines contain «—» while `WEB-DESIGN.md` bans them (scope decision pending) |

---

## 5. Proposed replacement copy

"Current" is copied verbatim. "Recommended" is Russian unless the context is an English-only string. Items marked **(glossary)** depend on the terminology decision in audit §7.5.

### 5.1 Navigation and page titles

| Context | Current text | Recommended text | Reason |
| --- | --- | --- | --- |
| Nav: dashboard (`user-copy.ru.ts:368`) | Дашборд | Overview **(glossary)** | Glossary: "Overview — protected product name, never translate". Alternatively amend the glossary |
| Nav: inventory group (`:371`; EN `:373` "Warehouse") | Склад | Склад **(glossary)** | Glossary maps Inventory → «Складской учёт». Recommend adding «Склад» as the approved compact nav form rather than lengthening the nav |
| Nav block description (`:415`) | Обзор, моторы, склад… | Дашборд, двигатели, склад… | Use the same words as the items it describes |
| Collections: uncategorized (`:384`) | Неразобранное | Без категории | In a dismantling business «неразобранное» reads as "not dismantled" |
| Engine intake workspace title (`:4391`) | Склад двигателей | Приёмка двигателей | The screen is intake; «Склад» is already the inventory group, and the screen's own action says «Закрыть приёмку» |

### 5.2 Engine vs Motor in the same hierarchy

| Context | Current text | Recommended text | Reason |
| --- | --- | --- | --- |
| Context panel title (`:495`) | Моторы | Двигатели | Glossary: do not mix Engine and Motor in one screen hierarchy |
| Context panel (`:496`) | Все моторы | Все двигатели | same |
| Context panel action (`:497`) | Продать мотор | Продать двигатель | same; matches quick action «Добавить двигатель» (`:389`) |
| Context panel action (`:498`) | Добавить мотор | Добавить двигатель | same |
| Sold empty state (`:1632`) | Отметьте продажу в разделе «Все моторы» — запись появится здесь. | Отметьте продажу в разделе «Двигатели», и запись появится здесь. | Names the real section; removes the em-dash |
| New record dialog (`:1644`) | Новый мотор | Новый двигатель | Customer-facing |
| History dialog (`:1742`) | История мотора | История двигателя | Customer-facing |
| Settings → clean-up (`:633`) | Удалить моторы | Удалить все двигатели | Names the scope of a destructive action |
| Settings → clean-up confirm (`:636`) | Удалить все моторы? | Удалить все двигатели? | same |
| Intake search placeholder (`:4397`) | Серийник, идентичность, сотрудник | Номер двигателя, марка, код, сотрудник | Glossary term «Номер двигателя»; «идентичность» is a calque |
| Intake action (`:4424`) | Выпустить в Motors Grid | Выпустить в каталог | Internal code name visible to customers |
| Intake label (`:4415`) | Пульс | Последняя активность | Literal translation of "heartbeat" |
| Intake action (`:4433`) | Изменить идентичность | Изменить данные двигателя | Calque of "identity" |
| Intake filter (`:4400`) | Документируют | Документирование | Status as a noun, not "they are documenting" |

### 5.3 Hard-coded English shown to all locales

| Context | Current text | Recommended text (RU / EN) | Reason |
| --- | --- | --- | --- |
| Intake release toast (`engine-intake-detail.tsx:329`) | Released to Motors Grid | Двигатель выпущен в каталог / Engine released to catalog | Not localized; internal name |
| Intake retake toast (`:345`) | Targeted retake sent to the field worker | Запрос на пересъёмку отправлен сотруднику / Retake request sent | Not localized |
| Intake quarantine toast (`:354`) | Engine moved to quarantine | Двигатель отправлен в карантин / Engine moved to quarantine | Not localized |
| Intake reject toast (`:363`) | Engine intake rejected | Приёмка двигателя отклонена / Engine intake rejected | Not localized |
| Intake identity toast (`:376`) | Expected engine identity updated | Данные двигателя обновлены / Engine details updated | Not localized; calque |
| Intake cancel toast (`:385`) | Engine intake job cancelled | Приёмка отменена / Intake cancelled | Not localized |
| Default quarantine reason (`:351`) | Manual inspection required | Требуется ручная проверка / Manual inspection required | Stored and later displayed |
| Dialog close, screen reader (`ui/dialog.tsx:78`) | Close | Закрыть (`userCopy.commonUi.closeAria`, already exists) | Not localized |
| Dialog footer button (`ui/dialog.tsx:116`) | Close | Закрыть | Not localized |
| Spinner (`ui/spinner.tsx:6`) | Loading | Загрузка | `aria-label` not localized |

### 5.4 Status labels

| Context | Current text | Recommended text | Reason |
| --- | --- | --- | --- |
| Work order `waiting_parts` (`:1991`) | Ждём запчасти | Ожидание запчастей | Status labels are neutral nouns, not "we" |
| Import `processing` (`:3540`) | AI разбирает | Анализ | Same state is «Анализ» in the other import flow (`:1916`) |
| Import `rolled_back` (`:1227`, `:1922`) | Откачен | Откат выполнен | Slang |
| Donor `in_progress` (`:4496`) | Разбирают | На разборке | Noun form, consistent with other statuses |
| Donor `scrapped` (`:4498`) | В металлолом | Утилизирован | Parallel to «Списано» for parts; state, not destination |
| Sync `dirty` (`:3822`) | Есть локальные изменения | Есть несохранённые изменения | Says what the user cares about |
| Grid offline notice (`:491`) | Офлайн — изменения в очереди | Нет сети. Изменения сохранятся при подключении | Plain language; no em-dash |

### 5.5 Loading, saving, errors

| Context | Current text | Recommended text | Reason |
| --- | --- | --- | --- |
| Loading (`:1244`) | Загрузка... | Загрузка… | Use the ellipsis character |
| Uploading (`:36`) | Загрузка… | Отправка… | «Загрузка» already means loading |
| Saving (`:180`, `:566`, `:695`, `:1142`, `:4318`, `:4333`, `:4501`) | Сохраняем… | Сохранение… | One progress form app-wide |
| Generic error (`:3485`) | Ошибка | Не удалось выполнить действие. Повторите попытку | Say what failed and what to do |
| File import fallback (`:3193`) | Что-то пошло не так. Попробуйте другой файл. | Не удалось прочитать файл. Проверьте формат или выберите другой файл. | Specific cause |

### 5.6 Confirmations and feedback

| Context | Current text | Recommended text | Reason |
| --- | --- | --- | --- |
| Warehouse import rollback, native `confirm()` (`:1217`) | Откатить импорт «{name}»? Остатки будут скорректированы. | Alert dialog. Title: «Откатить импорт «{name}»?» Body: «Позиции из этого импорта будут удалены, остатки пересчитаны. Действие нельзя отменить.» Buttons: «Отмена» / «Откатить импорт» | Native dialog uses browser button labels and theme; consequence must be explicit |
| Engine import rollback, native `confirm()` (`:1912`) | Отметить импорт «{name}» как откаченный? | Alert dialog with the same anatomy; confirm «Отметить как откаченный» | Same |
| Warehouse CSV import result, native `alert()` (`:1326`) | Импортировано строк: {count} | Success toast: «Импортировано {count} строк» (with plural forms) | Non-blocking feedback |
| Accounting clean-up confirm (`:632`) | Все операции кассы, расходов, продаж и авансов будут удалены без возможности восстановления. | Keep text. Confirm button: «Удалить финансы» + type-to-confirm company name | Text is good; add friction proportional to impact |
| Destructive confirm button (general) | Not implemented as a shared pattern | «Удалить {N} {объект}» | Button repeats the verb and object |
| Empty grid, no results for filters | Not implemented as a distinct state | «Ничего не найдено по фильтрам» + «Сбросить фильтры» | Distinguish from "no data yet" |

### 5.7 Buttons and tooltips

| Context | Current text | Recommended text | Reason |
| --- | --- | --- | --- |
| Top-bar column button (`layout.columns`, `:452`) | Колонки | Настроить столбцы | Icon-button label should name the action |
| Top-bar scanner (`layout.barcodeScanner`, `:453`) | Сканер штрихкода | Сканировать штрихкод | Action, not device |
| Dialog primary "done" (`:487`, `:984`) | Готово | Keep only for closing an informational step; never for committing data | Generic confirm label |

---

## 6. Design-system decisions vs translation decisions

| Design-system rule (applies to every language) | Translation decision (owned by i18n) |
| --- | --- |
| Sentence case, no uppercase labels | Exact Russian wording of each label |
| Buttons = verb + object | Choice between synonyms («столбцы» vs «колонки») |
| One progress form ("Saving…") and the `…` character | Plural forms (`Intl.PluralRules`) for counts |
| Status labels are neutral state nouns | Compact forms allowed by the glossary (`Наряд`, `КП`) |
| No internal code names in UI | Whether «Overview» stays untranslated |
| Destructive dialogs name object, count and consequence | Em-dash policy in Russian prose |
| No string literals in components (toasts, `aria-label`, `sr-only`) | — |

Recommended guardrail: a test or lint rule that fails when a string literal is passed to `toast(...)`, assigned to `message`, or used in `aria-label` / `sr-only` / `title` within `src/components` (excluding marketing and playground).
