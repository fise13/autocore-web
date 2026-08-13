# Graph Report - autocore-mobile/features/live-activity  (2026-08-11)

## Corpus Check
- 7 files · ~2,413 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 24 nodes · 46 edges · 4 communities (3 shown, 1 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `77c52f69`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- resolve-desired-live-activity.ts
- use-operations-live-activity.ts
- operations-live-activity.tsx
- ensureLiveActivityAppIconUri

## God Nodes (most connected - your core abstractions)
1. `useOperationsLiveActivity()` - 8 edges
2. `OperationsLiveActivity` - 6 edges
3. `ensureLiveActivityAppIconUri()` - 5 edges
4. `resolveDesiredLiveActivity()` - 5 edges
5. `applyDesired()` - 5 edges
6. `liveActivityContentKey()` - 4 edges
7. `endAllInstances()` - 4 edges
8. `OperationsLiveActivityHost()` - 2 edges
9. `assertLiveActivityAppGroup()` - 2 edges
10. `DesiredLiveActivity` - 2 edges

## Surprising Connections (you probably didn't know these)
- `assertLiveActivityAppGroup()` --calls--> `ensureLiveActivityAppIconUri()`  [EXTRACTED]
  autocore-mobile/features/live-activity/register-operations-live-activity.ts → autocore-mobile/features/live-activity/ensure-live-activity-icon.ts
- `applyDesired()` --calls--> `ensureLiveActivityAppIconUri()`  [EXTRACTED]
  autocore-mobile/features/live-activity/use-operations-live-activity.ts → autocore-mobile/features/live-activity/ensure-live-activity-icon.ts
- `OperationsLiveActivityHost()` --calls--> `useOperationsLiveActivity()`  [EXTRACTED]
  autocore-mobile/features/live-activity/operations-live-activity-host.tsx → autocore-mobile/features/live-activity/use-operations-live-activity.ts
- `useOperationsLiveActivity()` --calls--> `resolveDesiredLiveActivity()`  [EXTRACTED]
  autocore-mobile/features/live-activity/use-operations-live-activity.ts → autocore-mobile/features/live-activity/resolve-desired-live-activity.ts
- `useOperationsLiveActivity()` --calls--> `liveActivityContentKey()`  [EXTRACTED]
  autocore-mobile/features/live-activity/use-operations-live-activity.ts → autocore-mobile/features/live-activity/resolve-desired-live-activity.ts

## Import Cycles
- None detected.

## Communities (4 total, 1 thin omitted)

### Community 0 - "resolve-desired-live-activity.ts"
Cohesion: 0.31
Nodes (7): DesiredLiveActivity, liveActivityContentKey(), LiveActivityMode, LiveActivitySignals, progressFields(), resolveDesiredLiveActivity(), base

### Community 1 - "use-operations-live-activity.ts"
Cohesion: 0.67
Nodes (5): OperationsLiveActivityHost(), OperationsLiveActivity, applyDesired(), endAllInstances(), useOperationsLiveActivity()

### Community 3 - "ensureLiveActivityAppIconUri"
Cohesion: 0.60
Nodes (3): APP_ICON, ensureLiveActivityAppIconUri(), assertLiveActivityAppGroup()

## Knowledge Gaps
- **5 isolated node(s):** `APP_ICON`, `OperationsLiveActivityProps`, `base`, `LiveActivityMode`, `LiveActivitySignals`
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useOperationsLiveActivity()` connect `use-operations-live-activity.ts` to `resolve-desired-live-activity.ts`?**
  _High betweenness centrality (0.110) - this node is a cross-community bridge._
- **Why does `resolveDesiredLiveActivity()` connect `resolve-desired-live-activity.ts` to `use-operations-live-activity.ts`?**
  _High betweenness centrality (0.092) - this node is a cross-community bridge._
- **Why does `ensureLiveActivityAppIconUri()` connect `ensureLiveActivityAppIconUri` to `use-operations-live-activity.ts`?**
  _High betweenness centrality (0.075) - this node is a cross-community bridge._
- **What connects `APP_ICON`, `OperationsLiveActivityProps`, `base` to the rest of the system?**
  _5 weakly-connected nodes found - possible documentation gaps or missing edges._