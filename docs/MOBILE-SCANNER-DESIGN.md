# AutoCore Mobile Scanner — Experience Design

**Scope:** `autocore-mobile/features/scan` + mobile API (`scanResolve`, `scanOcr`, `scanDisambiguate`, `scanFeedback`)
**Date:** 4 July 2026
**Principle:** *The fastest scanner is the one that never asks a question it can answer itself.*

---

## 1. Design principles

1. **Deterministic first, AI last.** Every payload goes through an ordered chain of deterministic resolvers. AI (`scanDisambiguate`) is a fallback the user explicitly invokes — never a silent step in the hot path.
2. **Zero-mode scanning.** The user never chooses "QR mode" vs "barcode mode." The camera detects; the payload router classifies. Mode chips exist only for OCR capture (documents), where framing guidance genuinely differs.
3. **One frame, one answer.** From detection to sheet: target ≤ 400 ms for local classification, ≤ 900 ms including a network resolve. Anything slower shows progress *inside the frame*, not a blocking spinner.
4. **Every result is actionable in one tap.** A result sheet without a primary action is a failure.
5. **The scanner learns.** Every manual disambiguation writes a `barcodeMapping` via `scanFeedback` so the same code resolves instantly next time.

---

## 2. Payload router (deterministic classification)

All camera detections and OCR extractions flow through one pure function before any network call:

```
classifyPayload(raw: string) → PayloadClass
```

Ordered rules (first match wins — order matters, cost is zero):

| # | Rule | Class | Why deterministic |
|---|------|-------|-------------------|
| 1 | `autocore://` or `https://app.autocore.*/…` URL | `entity-link` | Our own QR format encodes entity type + id |
| 2 | 17 chars, `[A-HJ-NPR-Z0-9]{17}`, valid check digit (ISO 3779) | `vin` | VIN grammar + transliteration checksum is exact |
| 3 | EAN-13 / EAN-8 / UPC with valid checksum | `product-barcode` | Symbology + checksum from `expo-camera` metadata |
| 4 | Code128/Code39 matching internal SKU pattern (`^[A-Z]{2,4}-\d{3,6}$`) | `sku` | Company SKU grammar |
| 5 | Code128/Code39/DataMatrix, other | `generic-code` | Search warehouse, then fuzzy |
| 6 | QR with JSON payload (`{"t":…}`) | `structured-qr` | Partner label format, versioned schema |
| 7 | QR with arbitrary text | `text-qr` | Falls into generic search |
| 8 | ≥ 40 chars of extracted OCR text | `document-text` | Goes to the document parser, not item search |

**Entity-link QR schema** (generate these on web for every printable entity):

```
autocore://o/{orderId}      → work order
autocore://p/{itemId}       → inventory item
autocore://c/{clientId}     → client
autocore://s/{shelfCode}    → warehouse shelf
autocore://i/{invoiceId}    → invoice
autocore://m/{motorId}      → motor / engine
```

Opening an entity-link is **fully local**: parse → route. No network before navigation. The destination screen loads its own data.

---

## 3. Capture surface

### 3.1 Live viewfinder (default state)

- Full-bleed camera, existing `ScanFrameOverlay` frame (248 pt) centered.
- **Barcode + QR detection always on** (`expo-camera` `barcodeScannerSettings` — already configured: qr, ean13, ean8, code128, code39, datamatrix, pdf417).
- Frame edge glows `colors.primary` for 180 ms on detection (existing `detected` state) + light impact haptic.
- Duplicate suppression: same payload ignored for 2.2 s (already implemented in `scan-camera.tsx`).
- **Torch** and settings in header (existing). Torch auto-suggests: if 3 s pass with camera luma below threshold and no detection, pulse the torch button once. (Luma proxy: no detection + `Appearance` dark environment is acceptable v1 — skip if noisy.)

### 3.2 Mode strip (OCR capture only)

A horizontal chip strip **below the frame**, replacing nothing — barcode/QR stay live in every mode:

```
[ Авто ]  [ VIN ]  [ Документ ]
```

- **Авто** (default): live code detection only. Shutter button hidden.
- **VIN**: frame narrows to a wide ratio (VIN plates are one line). A shutter button appears. Hint text: «Наведите на VIN-табличку». Still scans QR/barcode live — many VINs are also encoded as Code39.
- **Документ**: frame expands to A4-ish portrait ratio, shutter appears, hint: «Счёт, накладная, чек или заказ-наряд». Document *type* is not chosen by the user — the parser classifies (see §6).

Chip switch = `haptics.selection()` + spring frame resize (`screenMotion.spring`), 60 fps via Reanimated layout on the frame's width/height shared values.

### 3.3 Glass panel (existing, keep)

Manual search · Photos · Recent scans. One addition: long-press on **Recent scans** re-runs the last payload immediately (skip the sheet).

---

## 4. Per-type flows

### 4.1 QR — entity links (instant open)

```
detect → classify(entity-link) → haptic success → navigate
```

- **No sheet. No resolve call.** Target: < 150 ms from detection to navigation start.
- Camera pauses on navigation (already handled by `freezeOnBlur` + `useIsFocused`).
- On return (back gesture), scanning resumes automatically; the same code stays suppressed for 2.2 s so the user doesn't bounce back.
- Unknown entity id → destination screen shows its own not-found state (scanner's job is done).
- Foreign QR (`text-qr`): treated as `generic-code` → §4.2 pipeline. URL QRs that aren't ours show a compact sheet: title = domain, primary action «Открыть в браузере», secondary «Искать в базе».

### 4.2 Barcode / SKU — product search

```
detect → classify → POST scanResolve (existing) →
  exact match      → Result sheet
  candidates (2–5) → Candidates sheet
  nothing          → Unknown sheet
```

Deterministic resolve chain **on the server** (already reflected in `ScanMatchType`): `barcode_mapping` → `sku` → `barcode_field` → `search_token` → `fuzzy`. AI is *not* in this chain.

**Result sheet** (existing `ScanResultSheet`, tightened):

- Header: name, SKU, status badge, price, stock by warehouse (`stockLevels`).
- Primary action adapts to context — this is the speed win:
  - default: **Открыть карточку**
  - if `can('inventory_edit')`: second button **Принять +1** (existing quick receive; keep toast success)
  - long-press «Принять +1» → stepper for quantity (batch receive without leaving the sheet)
- Footer: match provenance line («Найдено по штрихкоду», existing `matchTypeLabel`) — trust, not decoration.
- Sheet dismiss (swipe down) resumes scanning instantly. **Scanning continues while the sheet is open at half height**: scanning a second item replaces sheet content with a 150 ms crossfade. This makes inventory runs (scan-scan-scan) fluid.

**Candidates sheet** (existing): ranked list with score reason. Picking one fires `scanFeedback(user_picked_candidate)` → creates mapping → next scan of this code is exact. Show a one-time inline hint: «Запомним выбор для этого кода».

**Unknown sheet** (existing): actions in order — «Искать вручную» (prefilled search), «Спросить AI» (explicit, shows reasoning when returned), «Привязать к позиции». AI is opt-in per principle 1.

### 4.3 VIN — automatic vehicle search

Two entry paths, one pipeline:

- **Live:** Code39/QR that classifies as `vin` (rule 2) — zero extra work.
- **OCR:** VIN mode shutter → photo → `scanOcr` → `extractedCodes` filtered through the same VIN validator.

```
vin → local checksum ok →
  ┌ vehicles collection: exact VIN match → Vehicle sheet
  ├ work orders: VIN match             → listed in same sheet
  └ no match                           → New-vehicle sheet
```

**Vehicle sheet:**

- Header: make/model/plate (from `vehicleRepository`), VIN monospaced with copy button.
- Sections: owner (tap → call, reuse `openPhone`), last work orders (tap → order detail).
- Primary action: **Новый наряд** — opens composer with client + vehicle + VIN prefilled (composer already accepts these fields; pass via route params). This turns "car arrives at shop" into: scan VIN → one tap → composer step 2.

**New-vehicle sheet** (no match):

- Decoded hints shown deterministically from VIN itself: region (WMI table, chars 1–3), model year (char 10). No AI.
- Primary: **Создать наряд с этим VIN** (composer prefill). Secondary: «Искать вручную».

Client-side validation means we never send garbage to the server: OCR often confuses `I/1`, `O/0`, `Q` — the VIN alphabet excludes I, O, Q, so apply deterministic substitution (`I→1`, `O→0`, `Q→0`) *before* checksum, try both raw and corrected.

### 4.4 Document OCR — invoice / receipt / waybill / work order

One capture flow; the **parser classifies**, the user never labels the document first.

```
shutter → compress (1600 px long edge, q0.8) → POST scanOcr →
  server OCR (deterministic text extraction) →
  classifyDocument(text) →
  parse<Type>(text) → structured draft → Review sheet
```

**Document classifier — deterministic scoring, no AI:**

| Signal (regex/keyword over normalized text) | invoice | receipt | waybill | work-order |
|---|---|---|---|---|
| «Счёт на оплату», «Счёт №», ИНН/БИН + КПП | +3 | | | |
| «Кассовый чек», «ФН», «ФД», «ФП», QR fiscal tail | | +3 | | |
| «Накладная», «ТОРГ-12», «Отпустил/Получил» | | | +3 | |
| «Заказ-наряд», «Автомобиль», VIN present, «Работы» | | | | +3 |
| Table with qty × price columns | +1 | +1 | +1 | +1 |
| Total with «Итого/К оплате» | +1 | +1 | | +1 |

Highest score ≥ 3 wins; otherwise class = `unknown-document` (Review sheet still opens with raw line items if a table was detected, else offers «Спросить AI» as explicit fallback).

**Per-type extraction (all deterministic — regex + positional table parsing):**

- **Invoice:** supplier name/ИНН/БИН, invoice number + date, line items (name, qty, unit price, sum), VAT, total. Cross-check: Σ lines ≈ total (±1 unit) → confidence badge «Проверено» vs «Проверьте суммы».
- **Receipt:** merchant, datetime, fiscal QR (if the fiscal QR was captured live earlier, merge — it deterministically encodes total/date), line items, total.
- **Waybill:** number, date, sender/receiver, items with qty — maps to warehouse receive draft.
- **Work order (paper → digital):** client name/phone, vehicle, VIN (validated by §4.3 validator), plate, work lines, part lines, totals — maps to the order composer.

**Review sheet (the key OCR interaction):**

- Full-height sheet, sectioned like a form: header fields on top, line items as editable rows, total pinned at the bottom.
- Every extracted field is **editable inline**; low-confidence tokens (OCR confidence < threshold from server) get a soft warning underline — tap focuses the input with the original crop thumbnail shown above the keyboard so the user verifies against the photo, not memory.
- Line items match against inventory **deterministically** (SKU exact → name token search); matched rows show stock badge, unmatched rows show «Новая позиция».
- Primary action per class:
  - invoice → **Создать приход** (warehouse receipt draft)
  - receipt → **Записать расход** (accounting expense prefilled: amount, date, merchant as comment)
  - waybill → **Создать приход**
  - work-order → **Создать наряд** (composer prefilled)
- Secondary: «Сохранить как документ» (attach photo + parsed JSON to company documents).
- Nothing commits without the primary tap — OCR is a draft producer, never an auto-writer.

---

## 5. Speed engineering (interaction budgets)

| Step | Budget | How |
|------|--------|-----|
| Detection → haptic + frame glow | < 50 ms | Local, already in place |
| Entity QR → navigation | < 150 ms | No network in path |
| Barcode → result sheet | < 900 ms | Single `scanResolve`; sheet opens with skeleton rows at 300 ms if still pending (existing anim/resolve gate keeps this smooth) |
| VIN live → vehicle sheet | < 900 ms | One indexed Firestore query by VIN |
| OCR shutter → review sheet | < 4 s | Compress on-device before upload; progress shown *inside the frame* («Распознаём…» with the captured still dimmed underneath), scanning stays paused |
| Repeat scan of mapped code | < 400 ms | `barcode_mapping` hit + local 24 h LRU cache of last 50 resolves (serve cached sheet instantly, revalidate in background) |

Additional speed rules:

- **Prefetch on candidates:** when the candidates sheet opens, prefetch full item docs for the top 3 so picking one is instant.
- **Optimistic receive:** «Принять +1» updates the sheet stock number immediately, reconciles on response, rolls back with destructive toast on failure.
- **No cold sheets:** all three sheets (`result`, `candidates`, `unknown`) stay mounted (current architecture) — presenting is a native animation, not a React mount.

---

## 6. States, errors, permissions

| State | Treatment |
|-------|-----------|
| Camera permission denied | Existing in-frame prompt + «Открыть настройки» (keep) |
| Photos permission denied | Existing Alert + Settings deep link (keep) |
| Offline | Banner chip under header: «Оффлайн — коды откроются из кэша». Entity QR still navigates; resolves queue and replay on reconnect |
| Resolve failed (network) | Unknown sheet variant: «Не удалось проверить код» + Retry — never a dead end |
| OCR returned nothing | Toast warning (existing) + frame returns to live |
| Glare/blur on document | Deterministic pre-check on-device: if captured image variance below threshold, immediate retake hint «Слишком размыто — попробуйте ещё раз» without uploading |
| Low light | Torch pulse hint (§3.1) |

Haptics vocabulary (single system):

- detection: light impact
- resolve success: success notification
- candidates/unknown: warning notification
- receive success: success + toast
- error: warning + destructive toast

---

## 7. Deterministic vs AI — decision table

| Task | Method | AI? |
|------|--------|-----|
| Payload classification | Regex + checksums | Never |
| VIN validation/correction | ISO 3779 checksum + alphabet substitution | Never |
| Barcode → item | Mapping/SKU/field/token chain | Never |
| Document OCR (text extraction) | Server OCR engine | No (OCR ≠ LLM) |
| Document classification | Keyword scoring | Never |
| Invoice/receipt field extraction | Regex + table geometry | Never |
| Ambiguous item match (0 exact, weak fuzzy) | `scanDisambiguate` | **Yes — user-invoked button only** |
| Unstructured/foreign document | AI parse | **Yes — only after deterministic parse fails and user taps «Спросить AI»** |

---

## 8. Implementation map (existing → new)

| Piece | Status |
|-------|--------|
| Camera, symbologies, dedupe, torch | ✅ exists (`scan-camera.tsx`) |
| Result / candidates / unknown sheets | ✅ exists |
| `scanResolve` deterministic chain + `matchType` | ✅ exists |
| `scanFeedback` mapping learning | ✅ exists |
| `scanOcr` photo upload | ✅ exists |
| Quick receive + permissions | ✅ exists |
| `classifyPayload` router + entity-link QR scheme | ✅ `features/scan/lib/classify-payload.ts` + `open-entity.ts` |
| VIN validator/corrector | ✅ `features/scan/lib/vin.ts` |
| Vehicle sheet + composer prefill route params | ✅ VIN → `orders/new?vin=` (composer prefill + vehicle match) |
| Mode strip (Авто/VIN/Документ) + frame resize | ✅ `scan-mode-strip.tsx` + animated frame |
| Document classifier + per-type parsers | ✅ client-side (`classify-document.ts`, `parse-document.ts`); OCR returns `rawText` |
| Review sheet | ✅ `scan-document-sheet.tsx` |
| Resolve LRU cache + offline queue | 🆕 mobile |
| Web: print entity QR on orders/items/shelves/invoices | 🆕 web (prereq for §4.1) |

**Rollout order (each ships independently):**

1. `classifyPayload` + entity-link QR + instant open (server: none; web: QR printing)
2. VIN validator + vehicle sheet + composer prefill
3. Mode strip + capture UX polish
4. Document pipeline: classifier + invoice/receipt parsers + review sheet
5. Waybill/work-order parsers, offline queue, resolve cache

---

## 9. Interaction inventory (every touch)

| Gesture | Where | Result |
|---------|-------|--------|
| Point camera | viewfinder | auto-detect any code |
| Tap mode chip | mode strip | reframe + hint |
| Tap shutter | VIN/Документ | capture → OCR |
| Tap torch | header | toggle torch |
| Tap photos | glass panel | pick image → OCR |
| Tap manual search | glass panel | search screen focused |
| Tap recent | glass panel | recent sheet |
| Long-press recent | glass panel | instant re-run last payload |
| Swipe sheet down | any sheet | resume scanning |
| Scan while sheet open | result sheet | crossfade to new result |
| Tap primary action | result sheet | open / receive |
| Long-press receive | result sheet | quantity stepper |
| Tap candidate | candidates sheet | select + learn mapping |
| Tap «Спросить AI» | unknown sheet | explicit AI disambiguation |
| Tap field | review sheet | edit with crop preview |
| Tap primary | review sheet | create receipt/expense/order draft |
| Back after QR-nav | destination | camera resumed, code suppressed |

---

*This document is the source of truth for scanner UX. Implementation PRs should reference section numbers.*
