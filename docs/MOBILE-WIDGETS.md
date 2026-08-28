# Widgets & Lock Screen — iOS (AutoCore Mobile)

Home Screen widgets, Lock Screen accessories, and the Dynamic Island Live Activity
share one feed: [`OperationsLiveActivityHost`](../autocore-mobile/features/live-activity/operations-live-activity-host.tsx).

Provisioning / App Groups: [MOBILE-LIVE-ACTIVITIES.md](MOBILE-LIVE-ACTIVITIES.md).

**One slot = one action.** Live Activity is the only live layer. Widgets are stale-honest snapshots.

`createWidget` names for Floor and Intake stay `AutoCoreToday` and `AutoCoreIntake` so tiles already on a Home Screen do not vanish. Gallery titles, layouts, and the set of kinds changed.

## Surfaces

| Name | Gallery title | Job | Families |
| --- | --- | --- | --- |
| `OperationsLiveActivity` | — | Synced photo count | Island + Lock banner |
| `AutoCoreToday` | Floor | Hottest fact on the floor | Lock circular / rectangular / inline · Home small / medium / large (StandBy) |
| `AutoCoreScan` | Scan | Open the camera | Lock circular · Home small |
| `AutoCoreIntake` | Intake Bay | Ready vs documenting | Lock circular / rectangular / inline · Home small / medium |
| `AutoCorePay` | Pay | Payouts waiting / jobs to claim | Home small only |

SwiftUI allows four `createWidget` kinds plus the Live Activity. That is the full set.

`AutoCoreWork`, `AutoCoreWarehouse`, and `AutoCoreSync` are gone. Anyone who still had those tiles loses them.

Recommended first page: **Floor medium** + **Scan small**. Add **Intake small** if the person lives in intake. Add **Pay** only when they have something to claim or pay.

Lock Control / Control Center (iOS 18 `ControlWidget`) is out of scope — `expo-widgets` cannot register one.

## Floor (`AutoCoreToday`)

Hottest fact from [`buildTodayWidgetProps`](../autocore-mobile/features/live-activity/lib/widget-model.ts), hardest first: to place → waiting on parts → low stock → pay → intake awaiting → open orders → clear.

- **Small:** eyebrow `Needs you` / `Floor` → numeral → one line → relative time. Tap opens the hot URL (scan / orders / warehouse / earnings / intake).
- **Medium:** the same hot line in the header, then **Open** / **To place** / **Engines**. No buttons — the whole tile goes to the hot screen.
- **Large / StandBy:** hero numeral + title + detail, then the same three cells (not a second metric grid).

## Scan (`AutoCoreScan`)

A camera CTA, not a report.

- **Small:** SF `barcode.viewfinder`, title `Scan in`, detail `Place stock` or `Open camera`. Amber badge with the to-place count when `awaitingPlacement > 0`. App Intent `openScan` → `autocoremobile://scan`.
- **Lock circular:** symbol + to-place count, or a bare Scan glyph when the count is 0. Tap opens scan.

## Intake (`AutoCoreIntake`)

Rank on Home: Ready → syncing → Active. Lock circular always shows **Ready**.

- **Small:** Ready count (or Active when Ready is 0) + one line + one primary button.
- **Medium:** Ready | Active columns and buttons `Open Ready` / `Continue`.
- **Lock circular:** Ready only. Rectangular / inline: `2 Ready · 1 documenting`.

## Pay (`AutoCorePay`)

Home small only. Mechanics see jobs to claim; owners / payroll see pending payouts. Tap → `autocoremobile://earnings`.

If the person cannot open earnings, the tile is an honest empty (`Pay isn’t on for you`) — never someone else’s numbers.

No Lock families: Floor already promotes payout as the hottest fact.

## Lock Screen

Three languages, not a shrunk Home tile. Lock accessories use vibrant rendering — no hex colour, only weight + SF Symbol.

- **Inline:** one Floor line (`3 to place` / `Bay clear`). While an upload is live, the Island banner matters more; inline Floor does not compete with it.
- **Circular:** Floor (hot number) and Intake Ready. Scan circular is optional.
- **Rectangular:** Floor (eyebrow + title + detail).

Do not put a Sync circle on the Lock Screen. The queue lives on the Island.

## Island

One `OperationsLiveActivity` instance. [`resolveDesiredLiveActivity`](../autocore-mobile/features/live-activity/lib/live-activity-model.ts) is a **sync count**, not a documenting session:

1. Person-needed fail only (`FAILED`) — missing file / auth, still shown as `N/M`
2. Photos still leaving or parked (`SYNCING`, headline `3/8`) — including no-signal; never “Waiting for connection”
3. Idle — empty outbox. An open camera with nothing to upload does not keep the Island alive

Compact: glyph + `3/8`. Expanded / Lock banner: the same fraction + a thin ProgressView. No “Documenting”, no serial, no camera disc, no Gauge. Tap opens `autocoremobile://intake`.

Always-On still greys accents. After any layout edit bump `OPERATIONS_LIVE_ACTIVITY_LAYOUT_BUILD` and ship a device Release rebuild — Babel serializes only the `'widget'` function.

## Design

Home chrome: background `#0E0F13`, text white / `#EBEBF5` / muted `#8E8E93`, relative time `#6E6E73`.

System accents (not brand purple): sync `#0A84FF`, success `#30D158`, warn `#FF9F0A`, fail `#FF453A`, idle `#8E8E93`.

One job per widget: one headline, one supporting line. Medium may show two or three cells. Unknown counts render `—`, never a fabricated `0`.

Copy lives in [`widget-copy.ts`](../autocore-mobile/features/live-activity/lib/widget-copy.ts) and is passed as props. Widget layout functions cannot import modules (`'widget'` isolation).

## Data

The app process pushes snapshots into the App Group. WidgetKit redraws on its schedule. A content-keyed guard (`widgetSnapshotKey`) skips identical payloads so reload budget is not wasted on the clock.

Backgrounding always writes a fresh `updatedAtMs`. Signed out / lost company / no earnings access publishes blanks so another company's numbers cannot sit on the Lock Screen.

Intake Bay reads the same merged job list as the bay UI, including optimistic Ready after Finish. Floor’s intake count is `open` / `rework` only (engines waiting to be picked up), not in-session work.

## Deep links

| Source | URL |
| --- | --- |
| Floor (hottest item) | `scan` / `orders` / `warehouse` / `earnings` / `intake` / `work` |
| Scan / `openScan` | `autocoremobile://scan` |
| Pay | `autocoremobile://earnings` |
| Island (sync) | `autocoremobile://intake` |
| Intake Bay (Ready / `openReady`) | `autocoremobile://intake?filter=ready` |
| Intake Bay (Active / `continueIntake`) | `autocoremobile://intake?filter=active` |

Home widget buttons use those URLs via `addUserInteractionListener`. Lock accessories stay tap-to-open via `widgetURL` only.

## Device QA

Release rebuild is required after any `'widget'` layout change (`npm run ios:release --device`). Soft reload does not update the extension.

The iOS gallery only lists widgets compiled into `ExpoWidgetsTarget` (`index.swift` WidgetBundle). JS `createWidget(...)` alone is not enough — each `AutoCore*.swift` file must be in that target's Sources. If they vanish after prebuild, `plugins/with-ios-widget-extension-sources.js` puts them back. That plugin **adds** Swift files; it does not delete leftover `AutoCoreWork` / `AutoCoreWarehouse` / `AutoCoreSync` sources from an older prebuild — remove those files from `ios/ExpoWidgetsTarget` if they linger.

1. Add **Floor** (small / medium / large + lock circular / rectangular / inline), **Scan** (small + lock circular), **Intake Bay** (small / medium + lock), and optionally **Pay** (Home small). Confirm Work / Warehouse / Intake Sync are gone from the gallery.
2. Floor tap opens the hot screen (scan / orders / warehouse / earnings / intake) — not a generic Work hub.
3. Scan opens the camera. To-place badge matches receiving.
4. Intake Ready on the phone matches the bay (and web **In review**). Tap Ready → Ready tab; Continue → Active.
5. Sign out or switch company: Lock Screen numbers clear to `—` / AutoCore, not the previous tenant. Pay without earnings access shows `Pay isn’t on for you`, not another person's totals.
6. Photograph an engine: Island shows `N/M` synced while photos are in the outbox (including offline). It must not say Documenting. Empty queue ends the Island — it must not sit empty.
7. Settings → Notifications → Lock Screen copy lists Floor / Scan / Intake Bay.

## After layout edits

```bash
cd autocore-mobile
npm run ios:release --device
```
