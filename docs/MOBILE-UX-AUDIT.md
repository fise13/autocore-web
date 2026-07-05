# AutoCore Mobile — Production UX / UI Audit

**Scope:** `autocore-mobile/` (Expo Router, React Native)  
**Date:** 4 July 2026  
**Lens:** Apple Product Design + Linear-level product craft  
**Mode:** Audit only — no implementation

---

## Executive verdict

AutoCore Mobile has a **strong visual ambition** and a real design-token foundation. Auth, scan, accounting, and order composer show senior-level intent. The product does **not** yet feel like a finished Apple/Linear-grade app.

The gap is not “missing polish.” It is **trust, continuity, and hierarchy**:

1. Controls that look interactive but do nothing (or do the wrong thing).
2. Personalization that is hardcoded or demo-backed without clear product framing.
3. A settings/profile IA that is overgrown and self-duplicating.
4. Six parallel layout/typography systems fighting the shared design language.
5. Onboarding that can strand a new owner (no create-company path; email verify without refresh).
6. Settings toggles and “danger” actions that persist or confirm but never change product behavior.

Until those are fixed, motion and glass tab bars read as **costume**, not craft.

**Overall readiness:** pre-production / internal beta — not App Store–ready for a premium B2B audience.

---

## Screen inventory

| Surface | Route / entry | Role | Maturity |
|--------|----------------|------|----------|
| Login | `(auth)/login` | Email + OAuth entry | High (flow), Medium (legal/a11y) |
| Forgot password | `(auth)/forgot-password` | Reset | Medium (duplicated with login) |
| Verify email | `(auth)/journey/verify-email` | Gate | **Critical gaps** |
| Profile name | `(auth)/journey/profile-name` | Gate | Medium (redundant with signup) |
| Company / invite | `(auth)/journey/company` | Gate | **Critical gaps** |
| Mission Control | `(tabs)/index` | Home | Medium UI, **High trust issues** |
| Search | `(tabs)/search` | Global find | Medium idle, **Critical dead ends** |
| Scan | `(tabs)/scan` | Barcode / OCR | High |
| Orders list | `(tabs)/orders` | Work orders | Medium |
| Order detail | `(tabs)/orders/[id]` | Detail + status | Medium (fake actions) |
| Create order | `(tabs)/orders/new` | Composer | High |
| Accounting | `(tabs)/accounting` | Finance | High (best empty/loading) |
| Profile hub | `(tabs)/profile` | Settings root | Low IA |
| Profile/settings children | `profile/*` (14+ screens) | Config | Mixed; several dead-ends |
| Design system | `design-system` | Internal | Should not ship |
| Dead routes | `two`, `modal` | Scaffold | Remove |

---

## Priority legend

| Priority | Meaning |
|----------|---------|
| **Critical** | Breaks trust, blocks core jobs, or ships false UI |
| **High** | Daily friction, hierarchy, or consistency failures |
| **Medium** | Noticeable craft debt; fix in next quality pass |
| **Low** | Nice-to-have / cleanup |

**Complexity:** S (≤0.5d) · M (1–3d) · L (3–10d) · XL (multi-sprint)

---

## Critical issues

### C1 — Mission Control avatar is hardcoded to another person

**Problem:** Home header renders `Avatar name="Виктор К."` regardless of the signed-in user (`features/mission-control/components/mc-header.tsx`).

**Why it hurts UX:** Instant identity failure. Users assume the app is a demo, a bug, or someone else’s account. Apple-grade products never show the wrong person in the chrome.

**Priority:** Critical  
**Best solution:** Bind avatar to session profile (`displayName`, `photoURL`); fallback initials from real name; loading skeleton while profile resolves.  
**Complexity:** S

---

### C2 — Search results look tappable but navigate nowhere

**Problem:** Result rows render a chevron and `Pressable`, but `onPress` is never passed (`features/search/components/search-results.tsx`). Orders, clients, and parts cannot be opened.

**Why it hurts UX:** Search is a primary job-to-be-done. A chevron is a contract: “this goes somewhere.” Breaking that contract trains users to stop trusting the UI.

**Priority:** Critical  
**Best solution:** Wire navigation: orders → `/(tabs)/orders/[id]`; parts → inventory detail or scan result sheet; clients → client sheet/detail (create if missing). Disable chevron/press until a destination exists.  
**Complexity:** M

---

### C3 — Order swipe actions are lies

**Problem:** List wires both `onMarkReady` and `onCall` to `openOrder` (`orders-screen.tsx`). Swipe labels “Готов” and “Звонок” only open the card. Detail “Позвонить” and “Оплата” only fire haptics (`order-detail-screen.tsx`).

**Why it hurts UX:** Swipe actions are high-trust power tools. When they fake outcomes, users lose confidence in every other action in the app.

**Priority:** Critical  
**Best solution:** Implement real transitions (`transitionWorkOrder` for ready) and `Linking.openURL('tel:…')` when phone exists; hide actions when unavailable; show toast on failure. Never label an action that only navigates.  
**Complexity:** M

---

### C4 — Email verification can trap the user

**Problem:** Journey shows “resend email” only. There is no “Я подтвердил”, no `user.reload()` polling, and no deep-link return path. `emailVerified` is read once from auth state (`use-auth-journey-step.ts`).

**Why it hurts UX:** After confirming in Mail, the user returns to a dead screen. Support burden and drop-off spike at the worst moment (first session).

**Priority:** Critical  
**Best solution:** Poll `reload()` on interval + AppState focus; primary CTA “Продолжить” that reloads; secondary “Открыть почту”; clear error if still unverified.  
**Complexity:** S–M

---

### C5 — New owners cannot create a company in onboarding

**Problem:** Company journey only supports invite code + existing memberships. Workspace “Создать компанию” is `onCreateCompany={() => {}}` (`workspace-screen.tsx`). No owner bootstrap path on mobile.

**Why it hurts UX:** First-run for founders is blocked. Product feels incomplete vs web. Invite-only onboarding is fine for employees, fatal for owners.

**Priority:** Critical  
**Best solution:** Add create-company flow (name → create → set active) on journey and workspace; disable create for non-owners; keep invite as secondary path.  
**Complexity:** L

---

### C6 — Mission Control “Продажа” and “Новый наряд” are broken shortcuts

**Problem:** Quick action “Продажа” has no `route`. “Новый наряд” routes to `/(tabs)/orders` (list), not `/(tabs)/orders/new` (`use-mission-control-data.ts`).

**Why it hurts UX:** Home shortcuts exist to save taps. Extra taps and dead tiles make Mission Control decorative.

**Priority:** Critical  
**Best solution:** Route new order to composer; implement sale flow (scan-to-sell or dedicated sheet) or remove the tile until ready. Never ship primary tiles without destinations.  
**Complexity:** S (routing) / L (sale flow)

---

### C7 — Demo / mock data bleeds into product surfaces

**Problem:**

- Accounting shows full demo snapshot for non-production company IDs (`use-accounting-data.ts`) — caption exists, but UI still looks “live.”
- Workspace storage/sync uses `WORKSPACE_DEMO`.
- Account / Advanced show `DESKTOP_DEMO` (device, version, sync) as live facts.
- Scan falls back to `mock-scan-registry` in `__DEV__`.
- Mock files remain for profile, orders, mission control.

**Why it hurts UX:** Operators make decisions on fake balances, storage, and desktop link status. Demo mode must be unmistakable (Linear/Stripe: watermark, banner, disabled writes).

**Priority:** Critical (accounting/workspace/account) · High (dev scan mock)  
**Best solution:** Single `isDemo` product mode: persistent banner, disabled mutations, “Connect company” CTA. Remove silent demo fill for production builds; hide desktop block until real pairing exists.  
**Complexity:** M

---

### C8 — Settings controls that look real and do nothing

**Problem:**

- Appearance: accent color, animations, compact mode, and large text write Zustand only — **never consumed** by theme/UI (`appearance-settings-screen.tsx` + `appearance-settings-store.ts`). Theme preference alone works.
- Notifications (settings variant): business-event and email toggles bind to `DEMO_BUSINESS_PREFS` with `onValueChange={() => {}}` (`notifications-settings-screen.tsx`).
- Advanced: export, cache clear, and danger deletes confirm / haptic only — no API (`advanced-screen.tsx`).
- Mission Control activity title action “См. все” is `onAction={() => {}}` (`mc-activity-feed.tsx`). Accounting invoices “Все” is the same pattern.

**Why it hurts UX:** Highest-trust surfaces (identity prefs, notifications, data destruction) must never lie. Apple/Linear rule: no control without effect.

**Priority:** Critical  
**Best solution:** Implement or remove each control. Wire `animationsEnabled` into reduced-motion policy or delete the toggle. Persist real notification categories or show only working push master switch. Hide advanced danger until backends exist.  
**Complexity:** M–L

---

### C9 — Misleading Mission Control KPI (“Закрыто” / `salesToday`)

**Problem:** Metric labeled like period revenue uses **all** completed/delivered order totals, not calendar-day sales (`use-mission-control-data.ts`). Sparklines are synthesized.

**Why it hurts UX:** Operators trust home KPIs for cash decisions. Wrong numbers destroy product credibility faster than missing charts.

**Priority:** Critical  
**Best solution:** Filter by local calendar day (or rename to “Выручка закрытых”) and remove fake sparklines until history exists.  
**Complexity:** S

---

## High-priority issues

### H1 — Profile hub information architecture is overloaded and duplicated

**Problem:** Profile stacks: hero + 4 quick actions + “Компания” group + “Конфигурация” + “Бизнес” + “Приложение” + “Рабочее пространство” list + “Система” + danger zone. Company, subscription, and team appear in **quick actions and settings groups**. Workspace companies appear again at the bottom.

**Why it hurts UX:** Settings should be scannable in under 10 seconds. This is a second product. Users hunt; Apple Settings and Linear preferences never repeat the same destination three ways.

**Priority:** High  
**Best solution:** One hero (identity). One “Workspace” card (active company + switch). One settings list (Account, Appearance, Notifications, Navigation, Modules, Team, Billing, Advanced). Remove quick-action row or reduce to 1–2 true shortcuts.  
**Complexity:** M

---

### H2 — Dead-end settings screens (Language, Currency)

**Problem:** Language offers only Russian with a non-functional pressable. Currency is read-only KZT metadata with no edit path and no link to company settings.

**Why it hurts UX:** Rows imply control. Dead screens waste taps and look unfinished.

**Priority:** High  
**Best solution:** Remove Language until i18n exists; surface currency as read-only meta on Company (not a separate screen), or make it editable where policy allows.  
**Complexity:** S

---

### H3 — Duplicate appearance / notifications implementations

**Problem:** `AppearanceScreen` vs `AppearanceSettingsScreen`; `NotificationsScreen` vs `NotificationsSettingsScreen`. Profile routes to the thinner variants; richer settings exist but are partially orphaned.

**Why it hurts UX:** Divergent capability (accent color, compact mode, business notification toggles) depending on entry path. Design debt compounds.

**Priority:** High  
**Best solution:** One screen per concern; delete or re-export the other. Prefer the richer settings screens as canonical.  
**Complexity:** M

---

### H4 — Inconsistent empty / gate states

**Problem:** Accounting uses `EmptyState` + skeleton. Orders empty is plain muted text. Search/orders/accounting “no company” gates are bare centered text with different padding (often `padding: 24`). Search empty is a custom card, not shared `EmptyState`.

**Why it hurts UX:** Empty states are brand moments. Inconsistency signals different authors and different quality bars.

**Priority:** High  
**Best solution:** Shared `ScreenGate` (no company / no permission) and shared `EmptyState` with primary CTA (e.g. “Создать наряд”). Match accounting quality everywhere.  
**Complexity:** M

---

### H5 — Loading patterns are inconsistent

**Problem:** Orders overlays `Loading` on a still-visible list shell. Accounting swaps to full skeleton. Search shows inline loading only when groups are empty. Profile notifications shows “Загрузка…” text. Mission Control has no loading/skeleton for metrics.

**Why it hurts UX:** Users cannot form a mental model of “the app is working.” Skeleton → content is Linear’s standard; spinner-on-content feels older and jankier.

**Priority:** High  
**Best solution:** Per-feature skeleton matching final layout; reserve space for tab bar; never flash empty then content without transition.  
**Complexity:** M–L

---

### H6 — Six layout systems, no single rhythm

**Problem:** Feature-local tokens disagree:

| Token | MC | Search | Orders | Profile | Accounting | Settings |
|-------|----|--------|--------|---------|------------|----------|
| Horizontal pad | 16 | 16 | **20** | **20** | 16 | **20** |
| Section gap | 24 | 28 | 28 | 28 | 28 | 24 |
| Card radius | 14 | 16 | **18** | **18** | **20** | **20** |
| Title size | 20 | 22 | **34** | **34** | 22 | — |

Plus widespread hardcoded `gap: 10`, `padding: 14`, `fontSize: 11/13/15` outside tokens.

**Why it hurts UX:** Tab switches feel like different apps. Premium products share one density language.

**Priority:** High  
**Best solution:** Promote `theme/layout.ts` screen primitives (`screenPad`, `sectionGap`, `cardRadius`, `pageTitle`) and delete per-feature layout files or make them thin aliases. Ban magic numbers in review.  
**Complexity:** L

---

### H7 — Typography scale is bypassed

**Problem:** `theme/typography.ts` defines variants, but screens override with inline `fontSize` / `fontWeight` constantly (orders headers at 34, profile hero at 22, labels at 10–11, etc.). `Text` applies Dynamic Type scaling, then **user `style` overrides unscaled sizes**, so accessibility text size is partially defeated.

**Why it hurts UX:** Hierarchy becomes accidental. Large Text / accessibility users get uneven scaling. Brand type system is fiction.

**Priority:** High  
**Best solution:** Extend variants (`pageTitle`, `kpi`, `meta`, `sectionLabel`) and forbid fontSize overrides except in design-system showcase. Scale overrides through `dl.scaledSize` if ever needed.  
**Complexity:** L

---

### H8 — Touch targets below Apple HIG

**Problem:** `minTouchTarget = 36` in `theme/spacing.ts`. Apple HIG minimum is **44×44 pt**. Tab labels at `fontSize: 11` with icon-only emphasis; many chips and icon buttons risk sub-44 hits.

**Why it hurts UX:** Mis-taps, fatigue, App Review risk, exclusion of motor-oil-on-hands field use.

**Priority:** High  
**Best solution:** Set `minTouchTarget` to 44; audit IconButton, chips, swipe labels, filter pills; expand hitSlop where visuals stay small.  
**Complexity:** M

---

### H9 — Activity feed and attention items are non-interactive

**Problem:** Mission Control activity rows and attention banner items do not navigate to orders/inventory.

**Why it hurts UX:** Dashboard without drill-down is a poster. Linear/Apple Health always deep-link.

**Priority:** High  
**Best solution:** Tap activity → order detail; attention chips → filtered orders / low-stock search.  
**Complexity:** S–M

---

### H10 — Tab “Ещё” uses system `Alert.alert`

**Problem:** Overflow navigation opens a native alert menu (`app-tab-bar.tsx`).

**Why it hurts UX:** Breaks glass/blur premium chrome; no icons, no active state, no drag-reorder affordance continuity with Navigation settings.

**Priority:** High  
**Best solution:** Bottom sheet with same visuals as tab items; long-press already reserved — use sheet for overflow.  
**Complexity:** M

---

### H11 — Lists use ScrollView + map; FlashList unused

**Problem:** `components/ui/flash-list.tsx` exists; feature lists (orders, operations, search results, activity) use `ScrollView` + `.map()`.

**Why it hurts UX:** Jank and memory on real company data; scroll performance is part of perceived quality.

**Priority:** High  
**Best solution:** FlashList for orders, accounting operations, search results; stable keys; estimated item sizes.  
**Complexity:** M

---

### H12 — Create company / sale / payment are incomplete product loops

**Problem:** Workspace create is no-op; sale quick action missing; payment action is haptic-only.

**Why it hurts UX:** Core auto-service loops (sell part, take payment, open company) are incomplete on mobile.

**Priority:** High  
**Best solution:** Ship or hide. Prefer hide over fake.  
**Complexity:** L–XL

---

### H13 — Auth gate has no landing when authenticated but without access

**Problem:** When `journeyStep === 'app'` but `!hasAccess`, gate does not route to a dedicated awaiting-access screen (`authenticated-landing-screen` exists but is unwired). Journey screens also lack sign-out for wrong-email recovery.

**Why it hurts UX:** Users can land in an undefined shell or stay trapped on verify-email with no escape.

**Priority:** High  
**Best solution:** Route `!hasAccess` to a clear “ожидание доступа” screen with sign-out; add “Выйти / сменить аккаунт” on all journey steps.  
**Complexity:** S–M

---

### H14 — Silent failures and permission denials

**Problem:** Order status transition errors only trigger warning haptic. Scan photo-library denial returns silently. Several settings/actions give no toast.

**Why it hurts UX:** Field users assume success; support cannot diagnose.

**Priority:** High  
**Best solution:** Toast on every failed mutation; Alert + Settings deep link for permission denials.  
**Complexity:** S–M

---

## Medium-priority issues

### M1 — Onboarding asks for name twice

**Problem:** Signup collects first/last name; journey `profile-name` asks again if incomplete. OAuth users hit name step; email signup may still fail `isCompleteFullName` edge cases.

**Why it hurts UX:** Feels bureaucratic. Linear/Apple collect once.

**Priority:** Medium  
**Best solution:** Prefill journey from signup; skip step when complete; single name model.  
**Complexity:** S

---

### M2 — Forgot password has two patterns

**Problem:** Entry step sends reset inline; password step links to `/forgot-password`. Different copy and English placeholder on dedicated screen (`you@company.com` vs Russian product).

**Why it hurts UX:** Inconsistent mental model; language mix breaks polish.

**Priority:** Medium  
**Best solution:** One path: always dedicated screen or always inline; Russian placeholders throughout.  
**Complexity:** S

---

### M3 — Legal footer is non-interactive

**Problem:** Login footer mentions Terms and Privacy as plain text, not links.

**Why it hurts UX:** Trust and compliance; App Store expectation for account creation.

**Priority:** Medium  
**Best solution:** Tappable links to hosted policies (WebBrowser).  
**Complexity:** S

---

### M4 — Header language mix (Mission Control)

**Problem:** Home title is English “Mission Control” while the rest of the app is Russian.

**Why it hurts UX:** Brand can be English, but mixed chrome feels unfinished. Pick one system.

**Priority:** Medium  
**Best solution:** “Центр управления” or commit to English product names consistently (Scan, Orders, etc.).  
**Complexity:** S

---

### M5 — Fake sparklines / trends on Mission Control

**Problem:** Overview trends are synthesized (`salesToday * 0.7…`, flat arrays), not historical series.

**Why it hurts UX:** Charts imply insight. Fake trends are worse than no chart (Stripe/Linear never invent history).

**Priority:** Medium  
**Best solution:** Real series or remove sparklines until data exists.  
**Complexity:** M

---

### M6 — Animation systems are fragmented

**Problem:** Parallel enter hooks: `useMcEnter`, `useOrdersEnter`, `useProfileEnter`, `useSearchEnter`, `usePageEnter`, `FadeInUp` in search results, tab spring in `AnimatedTabScreen`, breathe loops on tab bar and MC primary action — similar but not identical timings/springs.

**Why it hurts UX:** Motion is a language. Inconsistent duration/damping feels “assembled,” not designed. Reduced motion is handled in many places (good) but not uniformly.

**Priority:** Medium  
**Best solution:** One `useScreenEnter({ delay, y })` + shared timelines in `theme/motion.ts`; feature timelines only for stagger indices.  
**Complexity:** L

---

### M7 — Staggered enter on every profile visit

**Problem:** Profile re-staggers large sections on each focus (delays up to 700ms+).

**Why it hurts UX:** Cute once; slow every time. Apple uses enter motion sparingly after first paint.

**Priority:** Medium  
**Best solution:** Animate only first mount per session; subsequent focuses static or 100ms fade.  
**Complexity:** S

---

### M8 — Root stack animation is `fade` for all

**Problem:** Root `Stack` uses `animation: 'fade'`; profile children use `slide_from_right`. Auth and tabs may feel abrupt vs iOS defaults.

**Why it hurts UX:** Platform expectations: push = horizontal, modal = vertical, tabs = cross-fade/none.

**Priority:** Medium  
**Best solution:** Align with iOS: tabs no stack animation; pushes slide; modals formSheet/pageSheet.  
**Complexity:** S

---

### M9 — Orders composer is long and multi-step without progress clarity on small phones

**Problem:** Three steps with tab bar; lots of fields; footer actions compete with keyboard and hidden tab bar.

**Why it hurts UX:** Cognitive load for field techs. Risk of lost work on back.

**Priority:** Medium  
**Best solution:** Persist draft; confirm discard; sticky step progress; autofocus next field; consider reducing step 1 fields.  
**Complexity:** M

---

### M10 — Accessibility coverage is uneven

**Problem:** Tab bar and some rows have roles/labels; many cards, metrics, activity rows, and icons lack `accessibilityLabel` / hints. Hardcoded font sizes fight Dynamic Type. Color-only status in places.

**Why it hurts UX:** VoiceOver users and large-text users get a second-class app.

**Priority:** Medium  
**Best solution:** Accessibility pass per screen; labels on all icon-only controls; status text + color; respect `maxFontSizeMultiplier` without override fights.  
**Complexity:** L

---

### M11 — Scan recent sheet / multi-sheet orchestration complexity

**Problem:** Multiple `BottomSheetModal` refs and race between animation and resolve (`resolveDoneRef` / `animDoneRef`). Powerful but fragile.

**Why it hurts UX:** Edge-case double sheets or delayed open feel broken in the field.

**Priority:** Medium  
**Best solution:** Single sheet host with view-state machine; integration tests for resolve paths.  
**Complexity:** M

---

### M12 — Business card components unused in product screens

**Problem:** `components/business/*` (engine-card, inventory-card, etc.) appear in design-system showcase more than live features; live screens invent one-off cards.

**Why it hurts UX:** Design system doesn’t ship; product reinvents.

**Priority:** Medium  
**Best solution:** Either adopt business cards in search/orders or delete/archive unused ones.  
**Complexity:** M

---

## Low-priority issues

### L1 — Dead routes and internal tools in router

**Problem:** `(tabs)/two.tsx` (obsolete “Firebase login disabled” placeholder), `app/modal.tsx` (“Modal placeholder”), `design-system` registered in root stack.

**Why it hurts UX:** Accidental navigation, larger bundle, unprofessional if reached.

**Priority:** Low  
**Best solution:** Remove from production router; gate design-system behind `__DEV__`.  
**Complexity:** S

---

### L2 — README claims screens are not built

**Problem:** `autocore-mobile/README.md` still says screens are intentionally not built and points at design-system tab.

**Why it hurts UX:** Onboarding for contributors is wrong; process debt.

**Priority:** Low  
**Best solution:** Update README to current IA and run instructions.  
**Complexity:** S

---

### L3 — Password strength uses hardcoded gold `#d39b23`

**Problem:** Login strength bar uses a one-off hex instead of theme token.

**Why it hurts UX:** Minor theme inconsistency in dark/light.

**Priority:** Low  
**Best solution:** Map to `colors.warning` scale token.  
**Complexity:** S

---

### L4 — English leftovers in UI kit

**Problem:** Dropdown default placeholder `"Select..."`; design-system English copy.

**Why it hurts UX:** Small cracks in an otherwise Russian product.

**Priority:** Low  
**Best solution:** Localize defaults.  
**Complexity:** S

---

## Cross-cutting design debt register

### Inconsistent spacing

- Screen padding 16 vs 20 across tabs.
- Tab bar bottom inset math differs from content `paddingBottom` (80 / 88 / 96).
- Magic gaps: 3, 5, 6, 10, 11, 14 mixed with spacing scale.
- Orders cards use `paddingHorizontal: 14` while layout pad is 20.

### Inconsistent typography

- Page titles: 20 (MC), 22 (search/accounting), 34 (orders/profile).
- Meta labels: 10–12 with ad-hoc letterSpacing.
- Weights 500/600/700/800 used without a type ramp rule.
- Inline overrides defeat Dynamic Type.

### Duplicated components / patterns

| Pattern | Instances |
|---------|-----------|
| Screen shell | `ProfileScreenShell` (= `SettingsScreenShell`) — good alias; still two appearance/notification screens |
| Empty states | `EmptyState`, `SearchEmptyState`, `AcAccountingEmptyState`, ad-hoc text |
| Segmented control | Profile segment used in accounting tabs area patterns |
| Enter animations | MC / Orders / Profile / Search / Auth presets |
| Settings rows | `settings-row`, `settings-toggle-row`, profile preference rows, notifications `ToggleRow` |
| Search fields | `SearchInput`, `OrdersSearch`, `SearchBar` — three search UIs |

### Unnecessary screens

- Language (single locale)
- Currency (read-only duplicate of company meta)
- Design system (prod)
- `two`, `modal`
- Potentially thinner appearance/notifications duplicates

### Unnecessary taps

- Home → New order lands on list → must tap create again
- Profile: Company reachable via quick action, settings group, and workspace list
- Search result → nowhere (wasted tap)
- Swipe “Готов” → opens detail instead of completing action
- Overflow tabs → Alert → choose → navigate (should be one sheet tap)

### Poor information hierarchy

- Profile: too many peer sections
- Mission Control metrics: “Закрыто” / “Наряды” / “Открытые” / “Склад” labels are vague; trends are decorative
- Orders header is huge (34pt) while MC is restrained (20pt) — no shared page-title role
- Accounting is dense but structured; orders list prioritizes chrome over list density

### Accessibility issues

- `minTouchTarget` 36
- Incomplete labels
- Font-size overrides vs Dynamic Type
- Color-only cues on badges/swipe actions
- Alert-based overflow not ideal for VoiceOver structure

### Animation inconsistencies

- Per-feature enter hooks and timelines
- Continuous breathe on tab Scan and MC primary action ( competes for attention)
- Profile long stagger every visit
- Search uses Reanimated layout animations; others use shared-value enters

### Loading problems

- No MC skeleton
- Orders spinner overlay
- Accounting skeleton (best-in-app)
- Text “Загрузка…” in settings
- Search loading only when empty groups

### Empty states

| Screen | Quality |
|--------|---------|
| Accounting | Strong (icon, copy, CTA) |
| Search no results | Good custom, not shared |
| Orders | Weak text only |
| Search/Orders no company | Weak text only |
| Mission Control no activity | Implicit empty (section may look broken) |
| Profile | N/A |

### Onboarding issues

- Verify email trap
- No create company
- Name collected twice
- No progress indicator across journey steps (verify → name → company)
- No skip rationale for OAuth email verification (correctly skipped — good)

### Navigation problems

- Dead search navigation
- Broken quick actions
- Tab visibility depends on modules (good) but overflow Alert (bad)
- Tab bar hidden on order/profile stacks (good) but inset helpers must stay in sync
- Profile stack depth: many peers, no search-in-settings
- `router.navigate` vs `push` mixed; back stack may surprise

### Design debt (engineering ↔ design)

- Feature-local `layout.ts` files instead of one layout language
- Mock/demo data modules still in tree
- FlashList wrapper unused
- Business components showcase-only
- README outdated
- Hardcoded user name in MC header (blocker)
- Permissions/demo permission groups in settings data may not match live RBAC

---

## What is already strong (keep)

Be honest about wins — these are the foundation to protect:

1. **Auth entry UX** — email detection, OAuth routing, password strength, offline/Firebase alerts, step transitions with reduced-motion respect.
2. **Scan flow** — camera, torch, OCR/photo, candidates/unknown sheets, haptics; feels product-real.
3. **Accounting** — skeleton, empty state with CTA, demo banner, tabbed IA, permission gates.
4. **Order composer** — structured steps, domain wiring, serious B2B form craft.
5. **Design tokens exist** — colors, motion easing (`autocoreEase`), spacing scale, haptics helpers, reduced motion hooks.
6. **Custom tab bar** — blur, capsule, module-aware items, accessibilityRole on tabs.
7. **Settings navigation editor** — product-differentiating when finished.

The job is not to redesign from zero. It is to **make every control tell the truth** and **one visual system speak everywhere**.

---

## Recommended fix order (no code — sequencing only)

### Sprint 0 — Trust (ship blockers)

1. Real user avatar on Mission Control  
2. Search result navigation  
3. Honest swipe / detail actions (or remove)  
4. Email verify reload loop + journey sign-out  
5. Hide or implement Sale / Create company / Payment  
6. Remove or implement placebo settings (appearance extras, notification business prefs, advanced danger)  
7. Strip `DESKTOP_DEMO` / `WORKSPACE_DEMO` from live-looking rows  
8. Fix or rename Mission Control revenue KPI; kill dead “См. все”  

### Sprint 1 — IA & empty/loading

9. Collapse profile hub  
10. Remove Language / Currency dead-ends  
11. Unify empty + gate components  
12. Orders/MC skeletons  
13. Demo mode banner system  
14. Wire `!hasAccess` landing  

### Sprint 2 — Design system enforcement

11. Single layout + type ramp  
12. 44pt touch targets  
13. FlashList for long lists  
14. One appearance + one notifications screen  
15. Tab overflow sheet  

### Sprint 3 — Motion & a11y polish

16. Shared enter motion  
17. First-visit-only staggers  
18. VoiceOver pass  
19. Remove dead routes / update README  

---

## Issue index (quick reference)

| ID | Priority | Area | Complexity |
|----|----------|------|------------|
| C1 | Critical | MC avatar hardcoded | S |
| C2 | Critical | Search dead navigation | M |
| C3 | Critical | Fake swipe/detail actions | M |
| C4 | Critical | Email verify trap | S–M |
| C5 | Critical | No create company | L |
| C6 | Critical | Broken home shortcuts | S–L |
| C7 | Critical | Demo data bleed | M |
| C8 | Critical | Placebo settings / dead section actions | M–L |
| C9 | Critical | Misleading MC revenue KPI | S |
| H1 | High | Profile IA | M |
| H2 | High | Dead-end settings | S |
| H3 | High | Duplicate settings screens | M |
| H4 | High | Empty/gate inconsistency | M |
| H5 | High | Loading inconsistency | M–L |
| H6 | High | Layout fragmentation | L |
| H7 | High | Typography overrides | L |
| H8 | High | Touch targets | M |
| H9 | High | Non-interactive MC feed | S–M |
| H10 | High | Alert overflow menu | M |
| H11 | High | ScrollView lists | M |
| H12 | High | Incomplete loops | L–XL |
| H13 | High | Unwired no-access landing / journey exit | S–M |
| H14 | High | Silent failures / permission denials | S–M |
| M1–M12 | Medium | Onboarding, motion, a11y, etc. | S–L |
| L1–L4 | Low | Dead routes, copy, tokens | S |

---

## Closing judgment

AutoCore Mobile currently reads as a **high-fidelity prototype with production data hooks** — not yet a production product.

Apple-level quality is mostly **restraint and honesty**: fewer screens, fewer animations, zero fake actions, one type system, one spacing rhythm, every row either works or is absent.

Linear-level quality is **density with clarity**: Mission Control that drills down, search that opens records, settings you can scan in one thumb scroll, empty states that teach the next action.

The shortest path to that bar is not more UI. It is **deleting lies, merging duplicates, and finishing the loops users already believe exist**.

---

*Audit based on full route map, feature screens, theme tokens, navigation, auth journey, and cross-cutting patterns in `autocore-mobile/` as of 4 July 2026.*
