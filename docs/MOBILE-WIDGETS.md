# Widgets & Lock Screen — iOS (AutoCore Mobile)

Home Screen widgets, Lock Screen accessories, and the Dynamic Island Live Activity
share one feed: [`OperationsLiveActivityHost`](../autocore-mobile/features/live-activity/operations-live-activity-host.tsx).

Provisioning / App Groups: [MOBILE-LIVE-ACTIVITIES.md](MOBILE-LIVE-ACTIVITIES.md).

## Surfaces

| Name | Gallery title | Job | Families |
| --- | --- | --- | --- |
| `OperationsLiveActivity` | — | Intake photo upload, live | Island + Lock banner |
| `AutoCoreToday` | Today at the shop | What needs a person on the floor | Lock circular / rectangular / inline · Home small / medium / large (StandBy) |
| `AutoCoreWork` | Work orders | Open vs waiting on parts | Lock circular / rectangular / inline · Home small / medium |
| `AutoCoreWarehouse` | Warehouse | Stock to place, low stock, engines | Lock circular / rectangular / inline · Home small / medium |
| `AutoCoreIntake` | Intake Bay | Ready vs Active engines | Lock circular / rectangular / inline · Home small / medium |
| `AutoCoreSync` | Intake Sync | Queue leftover after the Island ends | Lock circular / rectangular / inline · Home small |

Live Activity is the only frequent-update surface. Widgets are stale-honest snapshots.

Gallery order is shop-wide first. SwiftUI allows four widgets per `WidgetBundle`, so `index.swift` splits Today / Work / Warehouse / Intake, then Sync + the Live Activity.

## Design

Home chrome: background `#0E0F13`, text white / `#EBEBF5` / muted `#8E8E93`, relative time `#6E6E73`.

System accents (not brand purple): sync `#0A84FF`, success `#30D158`, warn `#FF9F0A`, fail `#FF453A`, idle `#8E8E93`.

Lock accessories use vibrant rendering — no hex colour, only weight + SF Symbol.

One job per widget: one headline, one supporting line. Medium may show two or three cells. Unknown counts render `—`, never a fabricated `0`.

Copy lives in [`widget-copy.ts`](../autocore-mobile/features/live-activity/lib/widget-copy.ts) and is passed as props. Widget layout functions cannot import modules (`'widget'` isolation).

## Data

The app process pushes snapshots into the App Group. WidgetKit redraws on its schedule. A content-keyed guard (`widgetSnapshotKey`) skips identical payloads so reload budget is not wasted on the clock.

Backgrounding always writes a fresh `updatedAtMs`. Signed out / lost `engine_intake_view` publishes blanks so another company's numbers cannot sit on the Lock Screen.

Today ranks hardest-first: stock to place → orders waiting on parts → low stock → pay waiting / jobs to claim → engines awaiting intake → open orders → clear. The tap opens that destination, not always Work. Medium still shows Orders / To place / Engines.

Intake Bay reads the same merged job list as the bay UI, including optimistic Ready after Finish. Today’s intake count is `open` / `rework` only (engines waiting to be picked up), not in-session work.

## Deep links

| Source | URL |
| --- | --- |
| Today (hottest item) | `scan` / `orders` / `warehouse` / `earnings` / `intake` / `work` |
| Work orders | `autocoremobile://orders` |
| Warehouse (to place) | `autocoremobile://scan` |
| Warehouse (otherwise) | `autocoremobile://warehouse` |
| Sync widget / Island | `autocoremobile://intake` |
| Intake Bay (Ready) | `autocoremobile://intake?filter=ready` |
| Intake Bay (Active) | `autocoremobile://intake?filter=active` |

Home widget buttons (`openReady`, `continueIntake`, `openIntake`, `openOrders`, `openScan`, `openWarehouse`) use the same URLs via `addUserInteractionListener`.

## Device QA

Release rebuild is required after any `'widget'` layout change (`npm run ios:release --device`). Soft reload does not update the extension.

The iOS gallery only lists widgets that are compiled into `ExpoWidgetsTarget` (`index.swift` WidgetBundle). JS `createWidget(...)` alone is not enough — each `AutoCore*.swift` file must be in that target's Sources. If they vanish after prebuild, `plugins/with-ios-widget-extension-sources.js` puts them back.

1. Add **Today at the shop**, **Work orders**, **Warehouse**, **Intake Bay**, and **Intake Sync** to the Lock Screen (circular + rectangular) and Home Screen (small; Today also medium / StandBy large).
2. Shoot intake photos: Island + Sync widget match the in-app banner.
3. Background the app mid-upload: Island keeps going; widgets show a relative timestamp.
4. Finish: Ready count on the phone and Intake Bay widget match web **In review**. Tap Ready → bay opens on the Ready tab.
5. Place unlocated stock / open a waiting-on-parts order: Today and the matching dedicated widget agree, and the tap lands on Scan / Orders / Warehouse — not always Work.
6. Sign out (or switch company): Lock Screen numbers clear to `—` / AutoCore, not the previous tenant.
7. Settings → Notifications → Lock Screen copy is present on iOS.

## After layout edits

```bash
cd autocore-mobile
npm run ios:release --device
```
