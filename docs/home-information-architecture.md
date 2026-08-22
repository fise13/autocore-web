# AutoCore Home — Information Architecture

**Version:** v1  
**Status:** Product specification for Dynamic Business Summary / Mission Control  
**Surface:** AutoCore Mobile Home (`/(tabs)/index`)  
**Mode:** Architecture only — **no UI implementation in this document**  

**Read with:**

| Document | Role |
| --- | --- |
| [`docs/design-language.md`](./design-language.md) | Visual & interaction SSOT |
| This file | What Home **does**, which data it ranks, where taps go |

**Code anchors (current):**

| Layer | Path |
| --- | --- |
| Live screen | `autocore-mobile/features/overview/overview-screen.tsx` |
| Live data | `autocore-mobile/hooks/use-overview-data.ts` → `OverviewSnapshot` |
| Types | `autocore-mobile/features/overview/types.ts` |
| Unmounted Health stack | `use-home-dashboard.ts`, `types-home.ts`, `components/home/*` — reference only, not shipped UI |
| Finance reuse | `features/finance/hooks/use-finance-model.ts`, `build-finance-model.ts` |
| Work counts | `features/work/hooks/use-work-counts.ts` |
| Actions | `lib/shell/workspace-registry.ts` (`ACTION_CATALOG`) |
| Roles | `packages/rbac` |

---

## 1. Main principle

Home is **not** a static dashboard.

### Definition

**Dynamic Business Summary / Mission Control** — a relevance-ranked operational brief for the signed-in user in the active company.

### Guiding question

> **What is important for me to know or act on right now?**

### Non-negotiables

1. There is **no mandatory fixed hero metric**. Revenue, Balance, Orders, and Inventory must **not** automatically own the first Summary slot.
2. Home **summarizes**; **Work** executes catalogs; **Finance** owns deep money narrative; **dock (+)** owns global create.
3. Empty optional sections are **omitted** (progressive disclosure — design-language §1.3).
4. Ranking is **deterministic** for a given data snapshot + preferences (no shuffle on reopen).
5. System-critical attention **outranks** user personalization.

---

## 2. Home structure

```text
Home
│
├── Context
│   ├── organization
│   ├── location / warehouse   (when product supports it)
│   └── current period
│
├── Summary
│   └── dynamically selected metrics
│
├── Trends
│   └── dynamically selected insights
│
├── Needs attention
│   └── actionable problems
│
├── Quick actions
│   └── real actions (not nav duplicates)
│
└── Recent activity
    └── latest operational events
```

**Visual order (target):** Context → Needs attention (if any) → Summary → Trends → Quick actions → Recent activity.

Attention may visually sit **above** Summary when severity ≥ warning (Apple Health–style “something needs you”). Ranking still treats attention as its own section, not as a metric.

---

### 2.1 Context

| Aspect | Spec |
| --- | --- |
| **Purpose** | Orient the user: which company, which time window, optionally which operational locus. |
| **Belongs** | Active organization name; user-facing period label (e.g. “Last 7 days”, “This month”); optional warehouse/location when multi-site UX exists. |
| **Does not belong** | KPIs, charts, CTAs, notification inbox content. |
| **Priority** | Always present when Home is accessible. |
| **Interaction** | Org name is display (company switch lives in Settings / switch-organization — not a Home control). Period control opens a small chooser or segment (target). Location filter — only if multi-location is productized. |
| **Drill-down** | Company switch → existing `/switch-organization` (page sheet). Period → updates HomeViewModel window (shared or Home-local; see §12). Location → **Requires future route / product decision** if not yet in Home. |
| **Empty** | Company name loading skeleton; never blank title. |
| **Loading** | Skeleton for name; period defaults to system default while prefs load. |
| **Error** | Keep last known company name; show soft error only if session has no company. |

**Current:** `McHeader` shows greeting + `useActiveCompanyName()` + notification bell. Period is **not** user-selectable on Home (hardcoded “this month” / 7d logic inside revenue resolver). Location/warehouse context on Home — **Not currently available**.

---

### 2.2 Summary

| Aspect | Spec |
| --- | --- |
| **Purpose** | Answer “what matters now?” with **2–4** ranked metrics (not a wallpaper of tiles). |
| **Belongs** | Metrics that win the ranking model (§5): value + unit + period + optional comparison/trend spark. |
| **Does not belong** | Full Finance ledger; Work catalog; decorative charts without a question; fixed Revenue hero. |
| **Priority** | Core section — always attempt to fill from available candidates; may show 1 metric if only one qualifies. |
| **Interaction** | Tap metric → destination (§14). Long-press / Customize — later (§12). |
| **Drill-down** | Per-metric `destination` (Finance, Orders, Warehouse, Engines, Earnings…). |
| **Empty** | Calm copy: no metrics for role/modules yet → point to Work or enable modules — not fake zeros presented as truth. |
| **Loading** | Structure-preserving metric skeletons (design-language loading). Treat counts as unknown until realtime ready (`useWorkCounts` pattern: `null` ≠ 0). |
| **Error** | Per-metric or section error with retry; do not zero-out silently when permission exists but fetch failed. |

**Current:** Fixed `McRevenueCard` + up to 2 `McStatTiles` (new orders 7d, parts count). Revenue/Balance-first — **must change**.

---

### 2.3 Trends

| Aspect | Spec |
| --- | --- |
| **Purpose** | Explain **what changed and why it may matter** — not a second copy of Summary numbers. |
| **Belongs** | 0–2 narrative trend cards: direction, significance, short explanation, optional quiet sparkline. |
| **Does not belong** | Raw KPI without narrative; LLM fluff; decorative area charts. |
| **Priority** | Secondary to Summary and Attention; omit when no significant change. |
| **Interaction** | Tap → metric destination or related filtered list. |
| **Drill-down** | Same as underlying metric family. |
| **Empty** | Section hidden (preferred) or one quiet line: “No notable changes this period.” |
| **Loading** | Chart-frame skeleton. |
| **Error** | Hide trend or show “Couldn’t load trends” with retry — never invent direction. |

**Current:** `McFeaturedInsight` is rule-based (stale motors / low stock / evening open orders / close rate) — closest ancestor. Unused `insights[]` in snapshot. Health-era `HomeTrend` types exist but are unmounted.

---

### 2.4 Needs attention

| Aspect | Spec |
| --- | --- |
| **Purpose** | Surface **actionable problems** that should interrupt calm Summary browsing. |
| **Belongs** | Blocking / warning / informational items with count, explanation, entity, action, destination (§8). |
| **Does not belong** | Vanity metrics; already-resolved items; generic tips without entity. |
| **Priority** | Highest product priority when severity is blocking or warning; can appear above Summary. |
| **Interaction** | Tap row → destination; optional primary action label. |
| **Drill-down** | Orders, warehouse, earnings, intake, search-filtered motors, etc. |
| **Empty** | Section **omitted** entirely. |
| **Loading** | Optional compact skeleton only if attention is often non-empty for role; else wait and omit. |
| **Error** | Soft banner “Attention may be incomplete” — do not clear known local items if partial cache exists. |

**Current:** `McAttentionBanner` from pending payroll, claimable WOs, `waiting_parts`, low stock, stale motors (≥90d).

---

### 2.5 Quick actions

| Aspect | Spec |
| --- | --- |
| **Purpose** | Start **real create/capture flows** in one tap. |
| **Belongs** | Actions that open intake, scan, new order, add part, new transaction, etc. (§9). |
| **Does not belong** | Pure navigation to dock tabs (Inventory, Finance as “browse”) — those are Work/Finance jobs. |
| **Priority** | Below Summary/Trends/Attention; hide section if no permitted actions. |
| **Interaction** | Tap → route or `presentActionSheet()` when the action is “open New menu”. |
| **Drill-down** | N/A (action endpoints). |
| **Empty** | Omit section. |
| **Loading** | Omit until RBAC/modules known. |
| **Error** | Disable action with feedback if module offline-blocked. |

**Current:** Add part (opens New sheet), Scan, Inventory, Finance — **Inventory/Finance are nav duplicates**; redesign per §9.

---

### 2.6 Recent activity

| Aspect | Spec |
| --- | --- |
| **Purpose** | Operational “what just happened” — not a Firestore changelog. |
| **Belongs** | Significant domain events with entity, event label, relative time, destination (§10). |
| **Does not belong** | Every field write; heartbeats; photo-byte sync ticks. |
| **Priority** | Lowest section; always valuable as a safety net when Summary is sparse. |
| **Interaction** | Tap row → entity detail; expand “All” for more. |
| **Drill-down** | Primarily `/orders/[id]`; later engines/warehouse when event types expand. |
| **Empty** | Short empty: “No recent activity” + optional CTA to Work. |
| **Loading** | 3 row skeletons. |
| **Error** | Keep cached list + error footnote. |

**Current:** Up to 20 work orders by `updatedAt`; UI shows 3 collapsed. Categories `inventory|sale|warranty|reservation` exist in types but are **unused**.

---

## 3. Dynamic Summary — business signals

Home selects Summary metrics from a **candidate pool**. Candidates are included only when:

- module enabled,
- RBAC scope/permission allows,
- data quality ≥ threshold (§5),
- value is defined (not unknown-as-zero).

### Signal inventory

| Signal | Availability in architecture | Primary sources | Home today? |
| --- | --- | --- | --- |
| **Revenue** | Available | Financial operations via `useFinanceModel` / `buildAccountingHeroMetrics`; WO closed revenue fallback in `resolveOverviewRevenue` | Yes (often as Balance/hero) |
| **Expenses** | Available | `FinanceModel.totals.expense`, ops | No on Home |
| **Profit / net** | Available | `FinanceModel.totals.net`, growth, margin | Partial (`todayNet` optional on revenue card) |
| **Cash balance** | Available | `calculateCashBalance` | Yes (finance mode labels “Balance · This month”) |
| **Orders (open / new)** | Available | Work orders realtime; `useWorkCounts.orders`; Home “New orders” = creates in 7d | Partial |
| **Engines sold** | Partially available | Motors with `soldDate` / status; Finance flow channel `engines` | **Not currently available** as Home metric |
| **Engines in stock** | Available | Motors realtime; `useWorkCounts.engines.total`; available filter in overview stale logic | Count not on live Summary (stale attention only) |
| **Parts (stock count)** | Available | Inventory items; Home tile uses `items.length` | Yes (tile; quality caveat: not “active available” only) |
| **Reservations** | Partially available | Motor `reserved` / `reservedForWorkOrderId`; part `totalReserved` | **Not currently available** on Home |
| **Documentation** | Partially available | Intake jobs / outbox; Live Activity; Health `build-home-dashboard`; engine docs in detail UI | **Not currently available** on live Mc Home |
| **Warranty** | Schema exists | Document type `engine-warranty`; WO warranty fields | **Not currently available** on Home |
| **Aging inventory** | Available (motors) | `isMotorStale` / `STALE_MOTOR_DAYS` (90); Engines `daysOnLot` | Attention/insight only, not Summary metric |
| **Inventory value** | **Not currently available** as a first-class Home/Finance aggregate in mobile Home path | — | No |
| **Pending work** | Available | Open WOs, `waiting_parts`, claimable, intake pending | Attention + Work counts; not Summary-ranked |
| **Recent activity** | Available (WO-only) | Sorted WO `updatedAt` | Activity section |
| **Runway / health score** | Available in Finance | `FinanceModel` health / `runwayDays` | **Not currently available** on Home |
| **Low stock parts** | Available | `isWarehouseLowStock` | Attention/insight |
| **Payroll pending / claimable** | Available | Payroll txs + `isClaimableWorkOrder` | Attention |

**Reuse priority for implementation:** compose Home candidates from `useFinanceModel` + `useWorkCounts` + existing overview motors/inventory helpers, rather than inventing parallel aggregations.

---

## 4. Metric model

Conceptual model adapted from `OverviewStatTile` / `OverviewRevenue` / Finance totals — for the future Home view model (not production TypeScript).

```text
HomeMetric
├── id                 // stable key, e.g. "cash.balance", "orders.open"
├── family             // money | orders | engines | parts | work | payroll | …
├── title              // user-facing short label
├── value              // number | null (null = unknown, never fake 0)
├── displayValue       // preformatted string when needed
├── unit               // currency code | count | days | percent
├── period             // { id, label, start, end }
├── comparison         // { previousValue, delta, deltaPercent, label } | null
├── trendSeries        // optional quiet spark points for the same period
├── scores             // ranking inputs (see §5)
│   ├── businessImportance   // 0–1 role/module prior
│   ├── urgency              // 0–1 time pressure
│   ├── anomaly              // 0–1 statistical / rule anomaly
│   ├── changeSignificance   // 0–1 magnitude of delta
│   ├── recency              // 0–1 how fresh the underlying events are
│   ├── roleRelevance        // 0–1 for current role
│   ├── userPreference       // pinned / hidden / boost
│   └── dataQuality          // 0–1 completeness/freshness of source
├── relevanceScore     // deterministic aggregate used for sort
├── destination        // route + optional params
├── permissionGate     // required permission/module keys
└── unavailableReason  // when excluded: "no_permission" | "module_off" | "insufficient_data" | …
```

### Field notes

| Field | Meaning |
| --- | --- |
| `id` | Stable across sessions so personalization and tests can pin/hide. |
| `value` | `null` means “not ready / unknown”. UI must not show `0` for unknown. |
| `period` | Align with Finance windows where possible (`7d` \| `30d` \| `3m` \| `1y`) — Home may default differently by role. |
| `comparison` | Required for Trends; optional on Summary chips. |
| `scores.*` | Inputs only; UI does not show raw scores. |
| `relevanceScore` | Single sort key — computed, deterministic. |
| `destination` | Must be an existing route or explicitly marked future. |

---

## 5. Metric ranking

### Goals

- Deterministic order for identical inputs.
- Prefer **urgent + important + trustworthy** over vanity.
- Respect pins without suppressing critical attention (attention is a separate section).
- Hide low-quality candidates rather than ranking them last with fake zeros.

### Algorithm (conceptual)

```text
For each candidate metric M where dataQuality ≥ Q_min and not user-hidden:
  relevanceScore(M) =
      w_i  * businessImportance(M, role, modules)
    + w_u  * urgency(M)
    + w_a  * anomaly(M)
    + w_c  * changeSignificance(M)
    + w_r  * roleRelevance(M, role)
    + w_p  * userPreferenceBoost(M)      // pinned >> default; hidden excluded
    + w_q  * dataQuality(M)
    + w_t  * recency(M)

Sort by relevanceScore DESC, then by id ASC (tie-break).
Take top K (K = 2..4 by layout density / role).
Pinned metrics: force-include up to P_max (e.g. 2), then fill remaining slots by score.
Never include a metric with dataQuality < Q_min unless pinned AND user acknowledges stale (future).
```

Suggested default weights (tunable; document changes in release notes):

| Weight | Focus |
| --- | --- |
| `w_u`, `w_a` | Highest — “act now” beats “interesting” |
| `w_i`, `w_r` | Role/module priors |
| `w_c` | Significant change vs prior period |
| `w_q` | Hard gate via `Q_min` plus soft contribution |
| `w_p` | Strong for pins; cannot override Attention section |
| `w_t` | Mild — prefer fresh operational domains |

### Determinism rules

1. Scores are functions of **rounded** inputs (e.g. delta percent to 1 decimal) so float noise does not reorder.
2. Clock-dependent urgency uses **bucketed time** (e.g. hour-of-day for “evening open orders”), not millisecond timestamps.
3. Reopen with unchanged cache → **same order**.
4. Do **not** randomize for “freshness of UI”.

### Role priors (businessImportance × roleRelevance seeds)

| Role | Higher prior families | Lower prior |
| --- | --- | --- |
| owner / admin / manager | cash/net, open work, aging engines, low stock | own payroll |
| accountant | cash, revenue, expense, net, payroll queues | intake photography |
| mechanic / diagnostician | assigned open work, claimable earnings, intake continue | company-wide P&L |
| employee | scoped inventory/orders per permissions | analytics-heavy metrics |

Exact permission checks still come from `@autocore/rbac` + modules.

---

## 6. Examples of dynamic states

Conceptual only — no invented figures.

### 6.1 Normal business day

- **Attention:** empty → omitted  
- **Summary:** e.g. Open orders · Parts available · Period net (whichever scores highest for role)  
- **Trends:** mild “Orders created near recent average” or omitted  
- **Quick actions:** Scan, Receive engine, New order (permitted)  
- **Activity:** recent WO updates  

### 6.2 High sales day

- **Summary:** Period revenue or engines/parts sales velocity rises to top via `changeSignificance` + `anomaly`  
- **Trends:** “Sales above recent average” with sparkline  
- **Attention:** unchanged unless fulfillment backlog triggers `waiting_parts` / open WO surge  
- Balance is **not** forced first unless it also scores high  

### 6.3 Documentation / intake problem

- **Attention:** blocking/warning “Intake incomplete” / sync failed (when wired from intake outbox — available in Live Activity / Health stack, **not** on live Mc Home yet) rises **above** Summary  
- **Summary:** may still show engines in stock / open work  
- **Trends:** optional “Documentation completion down” when signal exists  
- **Drill-down:** `/intake` or `/intake/[jobId]`  

### 6.4 Low activity

- Avoid empty dashboard feeling:  
  - Keep **Context** + at least one **stable stock metric** if dataQuality allows (engines/parts on hand)  
  - **Activity** empty state with CTA to Work  
  - **Trends** omitted  
  - One calm Summary line preferred over six zero tiles  
- Never fabricate “busy” charts  

### 6.5 Manager vs owner vs mechanic

| | Manager / Owner | Mechanic |
| --- | --- | --- |
| Summary | Company ops + money candidates | Assigned open jobs, claimable pay, intake continue |
| Attention | Low stock, aging lot, waiting parts, payroll ops | Claimable WOs, assigned waiting parts |
| Trends | Margin / volume narratives when permitted | Usually omitted or workload vs average |
| Quick actions | Receive engine, New order, Add part | Scan, Photograph engine, New order (if permitted) |
| Finance metrics | If `accounting_view` / `analytics_view` | Typically excluded by permission |

Accountant: Home may be money-heavy; ensure `canAccessOverview` + mobile tab policy still allow Home (mobile currently force-allows home tab for many roles — verify at implement time).

---

## 7. Trends

A Trend is a **narrative about change**, not a restated Summary value.

### Trend model

```text
HomeTrend
├── id
├── metricId           // links to HomeMetric family
├── title              // short headline
├── explanation        // why it may matter
├── direction          // up | down | flat | unknown
├── significance       // none | mild | notable | severe
├── comparisonPeriod   // e.g. previous 7d vs current 7d
├── series             // optional quiet points
├── destination
└── dataQuality
```

### Format examples (families vary)

- Revenue increased compared with previous period  
- Average days on lot increased  
- Engine sales are above recent average  
- Open work orders are stacking vs last week  
- Low-stock SKUs increased  

### Selection

- Derive from same candidate pool after Summary picks.  
- Prefer metrics with `changeSignificance` / `anomaly` above threshold.  
- Max **2** trends; omit section if none **notable**.  
- Explanation must be rule-based and honest (current Mc insights are rule-based — keep that bar; LLM optional later with same validation).

### Chart language

Per `docs/design-language.md`: calm SVG/Skia charts, minimal axes, ~1.75 stroke, area opacity ~0.12, last-point emphasis, period from Context.

---

## 8. Needs attention

### Attention item model

```text
AttentionItem
├── id
├── severity           // blocking | warning | informational
├── title
├── explanation
├── entity             // { type, id?, count? }
├── action             // primary verb label
├── timestamp          // when detected / since when
├── destination        // route + params
└── dismissible        // false for blocking system items
```

### Severity

| Level | Meaning | Examples (from current capabilities) |
| --- | --- | --- |
| **blocking** | Work or money flow is stuck / failed | Intake sync failed (Live Activity signal); **Future:** payment failure |
| **warning** | Needs timely human action | `waiting_parts`, low stock, stale motors ≥90d, claimable WOs, pending own payroll |
| **informational** | Useful but not urgent | Evening open-orders nudge (current insight) |

### Appearance rules on Home

Show when **all** are true:

1. User has permission to see the underlying entities.  
2. Count ≥ 1 (or entity exists).  
3. Severity ≥ informational **and** (severity ≥ warning **or** user has not muted this class).  
4. Item is not resolved in the current snapshot.  

**Ordering:** blocking → warning → informational; then by urgency/recency; then `id`.

**Personalization:** users may mute **informational** classes; cannot mute **blocking**; muting **warning** requires explicit Settings affordance (future) and still shows a residual “N muted” if product wants — default: warnings stay visible.

### Current → target mapping

| Current overview attention | Severity | Destination today |
| --- | --- | --- |
| Pending payroll | warning | `/earnings` |
| Claimable work orders | warning | `/earnings` |
| Waiting parts | warning | `/orders` |
| Low stock | warning | `/warehouse` (+ lowStock param) |
| Stale motors | warning | `/search?filter=motors&stale=1` |
| Intake incomplete / sync | blocking/warning | `/intake` — **wire from intake outbox** (available elsewhere, not Mc Home) |

---

## 9. Quick actions

### Principle

Quick Actions **start work**. They must not merely open the same destinations as bottom tabs.

### Current Home actions (`McQuickActions`)

| id | Label | Behavior | Verdict |
| --- | --- | --- | --- |
| `add` | Add part | `presentActionSheet()` | Keep as “New…” entry **or** replace with specific create actions |
| `scan` | Scan | `/(tabs)/scan` | Keep — real capture action |
| `inventory` | Inventory | `/warehouse` | **Remove from Quick Actions** — dock/Work navigation duplicate |
| `finance` | Finance | `/(tabs)/accounting` | **Remove from Quick Actions** — dock duplicate |

### Action catalog (existing product — `ACTION_CATALOG`)

| id | Title | Endpoint | Home Quick Action? |
| --- | --- | --- | --- |
| `scan` | Scan | `/(tabs)/scan` | Yes |
| `receive-engine` | Receive engine | `/intake?new=1` | Yes (motors + permission) |
| `photograph` | Photograph engine | `/intake` | Yes when open intake exists |
| `new-order` | New order | `/orders/new` | Yes |
| `add-item` | Add part | `/orders/create-item` | Yes |
| `new-transaction` | New transaction | `/finance/new` | Yes (accounting_edit) |
| `import-document` | Import document | `/import` | Optional |
| `search` | Search | `/search` | **No** — not an action; use header/search entry |

Dock (+) remains the full New sheet; Home shows **3–4 highest-context** actions from the same catalog (context-aware ordering already exists in shell via `contexts`).

### Future capability (label explicitly if used)

- Relocate stock as a one-tap Home action — relocate exists in warehouse flows; promote only when UX is a single clear entry (**Future capability** if not already a first-class action id).  
- AI composer as Quick Action — only when AI workspace ships; do not fake (**Future capability**).

---

## 10. Recent activity

### What counts as significant

| Include | Exclude |
| --- | --- |
| Work order created / status changed / completed | Listener heartbeats |
| Engine received / sold / reserved (when events exist) | Every photo upload byte progress |
| Part received / low-stock crossed (batched) | Raw financial op spam (Finance owns ledger activity) |
| Warranty issued (when available) | Debug/sync internals |

**Current live:** WO updates only (`category: 'order'`).

### Presentation rules

| Rule | Spec |
| --- | --- |
| Count | Default **3**; expand to **20** (match current) |
| Sort | `timestamp` DESC |
| Grouping | Optional by day label when expanded; collapsed list is flat |
| Fields | entity title, event/status, relative time, tone, destination |
| Destination | `/orders/[id]` today; engines → `/objects/engine/[id]` when events exist |

---

## 11. Role-aware Home

### Existing roles (`packages/rbac`)

`owner` · `admin` · `manager` · `accountant` · `mechanic` · `diagnostician` · `employee`

Scopes matter: mechanics/diagnosticians get **assigned** work orders; payroll often **own**.

### Prioritization sketch

| Role | Summary emphasis | Attention emphasis | Notes |
| --- | --- | --- | --- |
| **Owner** | Cash/net, sales velocity, open ops, aging stock | Low stock, stale engines, waiting parts | Full modules typical |
| **Manager** | Open work, stock, period net if permitted | Same operational warnings | Strong Work alignment |
| **Accountant** | Cash, revenue, expense, net | Payroll / negative cash (Finance attention) | May lack inventory priors |
| **Mechanic** | My open jobs, claimable earnings | Claimable, waiting parts on mine | Assignee scope |
| **Diagnostician** | Assigned open work | Assigned blockers | No `payroll_view_own` by default |
| **Employee** | Permission-scoped subset | Scoped warnings | Narrow permissions |
| **Admin** | Ops + settings-adjacent health | Operational + incomplete setup **if detected** | |

### Role system sufficiency

- Permissions + modules + data scopes are **sufficient** to gate metrics.  
- Shell `resolveHomeSections` already role-shapes an **unmounted** Health layout — reuse the idea, not the old section ids blindly.  
- Gaps: no first-class “Home metric preferences” store; accountant web allowlist historically omitted `home` while mobile tab policy still exposes Home — **implementers must re-verify** `canAccessOverview` + empty states for accounting-only users.  
- Do **not** invent new roles in this spec.

---

## 12. Personalization — Customize Home

### User can

- Pin metrics (up to small max)  
- Hide metrics  
- Reorder pinned metrics  
- Prefer a period (`7d` / `30d` / …)  
- Prefer section visibility (e.g. hide Trends) — **except** Attention when warnings exist  

### Priority stack

```text
1. System criticality   (blocking/warning Attention — always eligible)
2. Data permission      (RBAC / modules)
3. Data quality gate
4. User preference      (pin / hide / order / period)
5. Default ranking model
```

Personalization **must not** disable system-level urgent alerts.

### Storage (conceptual)

`users/{uid}` or company-employee prefs — **Not currently available** for Home metrics. Finance period store exists separately (`useFinancePeriodStore`) — decide whether Home shares it or keeps `homePeriod` preference.

---

## 13. Data states

Applies to each section.

### Loading

- Prefer **structure-preserving skeletons** (design-language).  
- Mirror Work counts: unknown until realtime ready — **do not flash “0 orders”**.  
- Pull-to-refresh reconnects listeners (current `useRealtimeReconnect`).

### Empty

- Omit optional sections (Attention, Trends, Quick Actions).  
- Summary: one calm empty guidance, not a grid of zeros.  
- Activity: explicit empty copy + link to Work.

### Partial data

- Show metrics that pass `dataQuality`; mark others unavailable in debug only.  
- Finance `gaps` pattern (`FinanceModel.gaps`) is the reference for honesty.  
- Attention may show subset if some sources failed.

### Error

- Section-level error + retry.  
- Do not replace permitted metrics with silent zeros (current revenue zeroing when lacking `accounting_view`/`analytics_view` is a **permission empty**, not an error — keep that distinction).

### Offline

| Current architecture | Home behavior (target) |
| --- | --- |
| React Query `offlineFirst` | Show last cached HomeViewModel |
| Intake / mutation outboxes | Surface pending/failed as Attention when known (Live Activity already does intake) |
| Finance offline copy | Reuse pattern: “Offline — showing last synced” on Context or banner |
| Overview today | No dedicated offline banner on Mc Home |

Home must remain useful offline for cached Summary + Activity; disable Quick Actions that require network if the destination cannot queue (or route into outbox-capable flows like intake).

---

## 14. Drill-down model

Use **existing** routes only. Mark gaps.

| Element | Destination | Status |
| --- | --- | --- |
| Revenue / expense / net / balance | `/(tabs)/accounting` · optional `/(tabs)/accounting/metric/[id]` · flow `/(tabs)/accounting/flow/[id]` | Existing |
| New / open orders | `/orders` · row → `/orders/[id]` | Existing |
| New order action | `/orders/new` | Existing |
| Parts / low stock | `/warehouse` · `?lowStock=1` | Existing (confirm param handling) |
| Engines list / aging | `/objects/engines` · detail `/objects/engine/[id]` | Existing list; **Home rarely links here today** — prefer over weak search when implementing |
| Stale motors (current) | `/search?filter=motors&stale=1` | Existing link; verify search filters |
| Intake / documentation | `/intake` · `/intake/[jobId]` | Existing |
| Import document | `/import` | Existing |
| Scan | `/(tabs)/scan` | Existing |
| Earnings / claim | `/earnings` | Existing |
| Work catalog | `/(tabs)/work` | Existing |
| Add part | `/orders/create-item` | Existing |
| New transaction | `/finance/new` (redirects into accounting new) | Existing |
| Company switch | `/switch-organization` | Existing |
| Dedicated documentation hub | — | **Requires future route** (intake/import cover capture) |
| Warranty inbox | — | **Requires future route** |
| Reservation queue | — | **Requires future route** (data partially on motors/parts) |
| Inventory valuation detail | — | **Requires future route** / **Not currently available** metric |

---

## 15. Home data contract

Conceptual view model for implementers (not production TS).

```text
HomeViewModel
├── meta
│   ├── companyId
│   ├── generatedAt
│   ├── offline
│   ├── dataQualityOverall     // ok | partial | stale | error
│   └── period                 // selected window
│
├── context
│   ├── organizationName
│   ├── locationLabel?         // null if N/A
│   ├── periodLabel
│   └── offlineBanner?
│
├── summary[]                  // HomeMetric, length 0..4, ranked
│
├── trends[]                   // HomeTrend, length 0..2
│
├── attention[]                // AttentionItem, severity-sorted
│
├── quickActions[]             // { id, title, subtitle?, href? , openNewSheet? }
│
├── activity[]                 // ActivityRow, newest first
│
└── permissions
    ├── canViewMoney
    ├── canViewOrders
    ├── canViewInventory
    ├── canViewMotors
    └── canCustomize
```

### Field notes

| Block | Responsibility |
| --- | --- |
| `meta` | Debugging, offline UX, cache freshness |
| `context` | Header / Context section |
| `summary` | Dynamic Summary only |
| `trends` | Narrative change section |
| `attention` | Needs attention |
| `quickActions` | Filtered ACTION_CATALOG (+ sheet opener) |
| `activity` | Operational feed |
| `permissions` | Drive empty states without probing each metric |

**Mapping from current `OverviewSnapshot`:** evolve toward this contract; do not keep a mandatory `revenue` object. Unmounted `types-home.ts` / `useHomeDashboard` are historical sketches — align names carefully to avoid shipping two Homes.

---

## 16. Design constraints (from design-language.md)

Home IA must ship inside the Design Language:

| Constraint | Application on Home |
| --- | --- |
| Grouped surfaces | Prefer inset grouped lists for Attention/Activity; fewer floating squircles than current Mc cards |
| Apple Health hierarchy | Context → Attention → Summary → Trends → Actions → Activity; progressive disclosure |
| Stripe intelligence | Metrics literate (period, comparison, honest gaps) |
| Linear density | 2–4 summary metrics, not 8 tiles |
| Semantic color | Attention tones via `warning`/`danger`/`success`; never color-only status |
| Calm charts | Trends use quiet chart language |
| Minimal noise | No decorative gradients; no nav-duplicate Quick Actions |
| Dock (+) | Global New sheet remains system create — Home actions complement, don’t replace |
| Tokens | `@autocore/design-tokens` + `theme/tokens` / typography only |

UI details are **out of scope** here; implementers follow `docs/design-language.md` when building screens.

---

## 17. Current → Target

| Current Home | Target Home | Reason | Priority |
| --- | --- | --- | --- |
| Static Mission Control card stack | Dynamic Business Summary IA | Guiding question / design-language Home | High |
| Revenue/Balance-first `McRevenueCard` | Ranked `summary[]` without fixed hero | No mandatory primary metric | High |
| Growth % may be profit÷income (finance mode), not WoW | Honest comparison per metric definition | Trust / Stripe literacy | High |
| Two fixed tiles (new orders, parts length) | Ranked candidates from Finance + Work counts + motors | Relevance | High |
| `McFeaturedInsight` single rule card | `trends[]` + keep rules as engines | Narrative change | Medium |
| Attention banner (good seed) | Typed AttentionItem + intake/docs signals | Needs Attention as key pillar | High |
| Quick Actions: Inventory + Finance nav | Action-catalog creates only | No dock duplicates | High |
| Activity = WO updates only | WO + expand event types when ready | Operational feed | Medium |
| No period control on Home | Context period (share or mirror Finance) | Comparable metrics | Medium |
| No location context | Optional when multi-site productized | Context completeness | Low |
| Offline: cache silent | Explicit offline banner + Attention for failed sync | Mobile reality | Medium |
| Unmounted Health Home (`useHomeDashboard`) | Do not revive as second UI; harvest ideas into one VM | Avoid dual Homes | High |
| Bottom nav unchanged | Keep Home · Work · (+) · Finance · Settings | Shell SSOT | — |
| Personalization absent | Customize Home with criticality > preference | Long-term | Low (after VM) |

---

## Recommended implementation order

Do **not** implement UI in the same step as inventing data lies. Sequence:

### 1. Data layer

- Inventory sources: finance ops, WOs, inventory, motors, payroll, intake outbox.  
- Shared “ready vs unknown” semantics (from `useWorkCounts` / realtime registry).  
- Offline cache stamp on HomeViewModel.

### 2. Metric calculation

- Define pure functions per `HomeMetric.id` (testable).  
- Reuse `buildFinanceModel` windows where possible; fix Home-specific definitions (e.g. parts = active available, not raw `items.length`).  
- Emit `unavailableReason` instead of fake zeros.

### 3. Ranking

- Implement deterministic scorer + golden tests (fixtures for roles/scenarios in §6).  
- Pin/hide hooks with empty preference store first (defaults only).

### 4. Home view model

- Build `HomeViewModel` assembler (successor to `useOverviewData` / harvest `useHomeDashboard`).  
- Single hook for the future screen; keep old Mc screen until cutover.

### 5. Chart system

- Extract quiet sparkline/line API per design-language Charts.  
- Wire only into Trends (and optional Summary spark) — no decorative charts.

### 6. UI implementation

- New Home sections per this IA + design-language (grouped surfaces, omit empties).  
- Replace Mc composition in a dedicated PR; no parallel Health UI.

### 7. Animation

- Enter/section motion via existing `tokens.motion` / `useMotion`; reduced-motion safe.  
- No per-row noise.

### 8. Personalization

- Prefs persistence + Customize Home sheet.  
- Enforce criticality > preference.

### 9. Testing

- Unit: metric math, ranking determinism, attention rules.  
- Integration: RBAC × modules fixtures.  
- Offline: cached VM + banner.  
- Device smoke: Dynamic Type, empty company modules, mechanic vs owner.

---

## Appendix — Scenario checklist for QA

- [ ] Owner, full modules, normal day  
- [ ] Mechanic, assigned scope only  
- [ ] Accountant, money-only permissions  
- [ ] Offline with warm cache  
- [ ] Attention-only (no money permission)  
- [ ] Low activity / new company  
- [ ] Intake sync failed surfaces above Summary  

---

**End of specification.** Implementers should need only `docs/design-language.md` + this file to build Home without further product briefing.
