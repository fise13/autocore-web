# Graph Report - autocore-mobile/features/live-activity  (2026-08-11)

## Corpus Check
- 6 files · ~2,040 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 21 nodes · 38 edges · 3 communities (2 shown, 1 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `77c52f69`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- resolve-desired-live-activity.ts
- use-operations-live-activity.ts
- operations-live-activity.tsx

## God Nodes (most connected - your core abstractions)
1. `useOperationsLiveActivity()` - 8 edges
2. `OperationsLiveActivity` - 6 edges
3. `resolveDesiredLiveActivity()` - 5 edges
4. `liveActivityContentKey()` - 4 edges
5. `endAllInstances()` - 4 edges
6. `applyDesired()` - 4 edges
7. `OperationsLiveActivityHost()` - 2 edges
8. `DesiredLiveActivity` - 2 edges
9. `progressFields()` - 2 edges
10. `OperationsLiveActivityProps` - 1 edges

## Surprising Connections (you probably didn't know these)
- `OperationsLiveActivityHost()` --calls--> `useOperationsLiveActivity()`  [EXTRACTED]
  autocore-mobile/features/live-activity/operations-live-activity-host.tsx → autocore-mobile/features/live-activity/use-operations-live-activity.ts
- `useOperationsLiveActivity()` --calls--> `resolveDesiredLiveActivity()`  [EXTRACTED]
  autocore-mobile/features/live-activity/use-operations-live-activity.ts → autocore-mobile/features/live-activity/resolve-desired-live-activity.ts
- `useOperationsLiveActivity()` --calls--> `liveActivityContentKey()`  [EXTRACTED]
  autocore-mobile/features/live-activity/use-operations-live-activity.ts → autocore-mobile/features/live-activity/resolve-desired-live-activity.ts
- `applyDesired()` --references--> `OperationsLiveActivity`  [EXTRACTED]
  autocore-mobile/features/live-activity/use-operations-live-activity.ts → autocore-mobile/features/live-activity/operations-live-activity.tsx
- `endAllInstances()` --references--> `OperationsLiveActivity`  [EXTRACTED]
  autocore-mobile/features/live-activity/use-operations-live-activity.ts → autocore-mobile/features/live-activity/operations-live-activity.tsx

## Import Cycles
- None detected.

## Communities (3 total, 1 thin omitted)

### Community 0 - "resolve-desired-live-activity.ts"
Cohesion: 0.31
Nodes (7): DesiredLiveActivity, liveActivityContentKey(), LiveActivityMode, LiveActivitySignals, progressFields(), resolveDesiredLiveActivity(), base

### Community 1 - "use-operations-live-activity.ts"
Cohesion: 0.67
Nodes (5): OperationsLiveActivityHost(), OperationsLiveActivity, applyDesired(), endAllInstances(), useOperationsLiveActivity()

## Knowledge Gaps
- **4 isolated node(s):** `OperationsLiveActivityProps`, `base`, `LiveActivityMode`, `LiveActivitySignals`
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useOperationsLiveActivity()` connect `use-operations-live-activity.ts` to `resolve-desired-live-activity.ts`?**
  _High betweenness centrality (0.152) - this node is a cross-community bridge._
- **Why does `OperationsLiveActivity` connect `use-operations-live-activity.ts` to `operations-live-activity.tsx`?**
  _High betweenness centrality (0.138) - this node is a cross-community bridge._
- **Why does `resolveDesiredLiveActivity()` connect `resolve-desired-live-activity.ts` to `use-operations-live-activity.ts`?**
  _High betweenness centrality (0.105) - this node is a cross-community bridge._
- **What connects `OperationsLiveActivityProps`, `base`, `LiveActivityMode` to the rest of the system?**
  _4 weakly-connected nodes found - possible documentation gaps or missing edges._