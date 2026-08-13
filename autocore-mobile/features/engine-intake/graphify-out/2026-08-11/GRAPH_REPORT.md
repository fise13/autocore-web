# Graph Report - autocore-mobile/features/engine-intake  (2026-08-11)

## Corpus Check
- 18 files · ~8,954 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 102 nodes · 219 edges · 12 communities
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.57)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `77c52f69`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- engine-intake-jobs-screen.tsx
- intake-outbox.ts
- use-engine-intake-data.ts
- publish
- evidence-labels.ts
- engine-intake-session-screen.tsx
- intake-job-row.tsx
- engineIntakeId
- engine-intake-api.ts
- intake-camera.tsx
- intake-capture-chrome.tsx

## God Nodes (most connected - your core abstractions)
1. `EngineIntakeJobsScreen()` - 14 edges
2. `EngineIntakeSessionScreen()` - 13 edges
3. `drain()` - 12 edges
4. `publish()` - 11 edges
5. `engineIntakeId()` - 10 edges
6. `useEngineIntakeOutbox()` - 10 edges
7. `useEngineIntakeJobs()` - 8 edges
8. `getEngineIntakeDeviceId()` - 8 edges
9. `drainIntakeOutbox()` - 8 edges
10. `sendOrQueueIntakeCommand()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `EngineIntakeJobsScreen()` --calls--> `useEngineIntakeJobs()`  [EXTRACTED]
  autocore-mobile/features/engine-intake/engine-intake-jobs-screen.tsx → autocore-mobile/features/engine-intake/hooks/use-engine-intake-data.ts
- `EngineIntakeJobsScreen()` --indirect_call--> `getEngineIntakeDeviceId()`  [INFERRED]
  autocore-mobile/features/engine-intake/engine-intake-jobs-screen.tsx → autocore-mobile/features/engine-intake/lib/device.ts
- `EngineIntakeJobsScreen()` --calls--> `sendOrQueueIntakeCommand()`  [EXTRACTED]
  autocore-mobile/features/engine-intake/engine-intake-jobs-screen.tsx → autocore-mobile/features/engine-intake/store/intake-outbox.ts
- `EngineIntakeJobsScreen()` --calls--> `useEngineIntakeOutbox()`  [EXTRACTED]
  autocore-mobile/features/engine-intake/engine-intake-jobs-screen.tsx → autocore-mobile/features/engine-intake/store/intake-outbox.ts
- `EngineIntakeSessionScreen()` --calls--> `useEngineIntakeJobDetail()`  [EXTRACTED]
  autocore-mobile/features/engine-intake/engine-intake-session-screen.tsx → autocore-mobile/features/engine-intake/hooks/use-engine-intake-data.ts

## Import Cycles
- None detected.

## Communities (12 total, 0 thin omitted)

### Community 0 - "engine-intake-jobs-screen.tsx"
Cohesion: 0.23
Nodes (16): IntakeOutboxBanner(), IntakeOutboxBannerProps, ACTIVE_STATES, BayFilter, createClaimCommand(), EngineIntakeJobsScreen(), isPermissionError(), isWorkerScoped() (+8 more)

### Community 1 - "intake-outbox.ts"
Cohesion: 0.21
Nodes (13): getSnapshot(), IntakeOutboxCommand, IntakeOutboxPhoto, IntakeOutboxSnapshot, isUnrecoverableOutboxError(), listeners, PersistedOutbox, photoFileMissing() (+5 more)

### Community 2 - "use-engine-intake-data.ts"
Cohesion: 0.27
Nodes (8): EngineIntakeLaunch(), IntakeLaunchCard(), EMPTY_JOB_DETAIL, JobDetailState, jobsCacheKey(), JobsState, useEngineIntakeJobDetail(), useEngineIntakeJobs()

### Community 3 - "publish"
Cohesion: 0.29
Nodes (7): buildSnapshot(), clearFailedIntakeOutbox(), publish(), removeIntakeOutboxItem(), retryIntakeOutboxItem(), saveIntakePhotoLocally(), updateCommand()

### Community 4 - "evidence-labels.ts"
Cohesion: 0.43
Nodes (5): IntakeEvidenceChecklist(), Props, evidenceGuidance(), FACET_LABELS, missingEvidenceLabels()

### Community 5 - "engine-intake-session-screen.tsx"
Cohesion: 1.00
Nodes (3): EngineIntakeSessionScreen(), enqueueIntakeCommand(), sendOrQueueIntakeCommand()

### Community 6 - "intake-job-row.tsx"
Cohesion: 0.53
Nodes (5): IntakeJobRow(), IntakeJobRowProps, jobSerial(), jobSubtitle(), lifecycleBadgeVariant()

### Community 7 - "engineIntakeId"
Cohesion: 0.29
Nodes (7): commandFailureBlocksJob(), drain(), errorMessage(), isTerminalError(), noteSyncSuccess(), resetSyncSession(), updatePhoto()

### Community 8 - "engine-intake-api.ts"
Cohesion: 0.50
Nodes (4): finalizeEngineIntakePhoto(), prepareEngineIntakePhoto(), sendEngineIntakeCommand(), uploadPhoto()

### Community 9 - "intake-camera.tsx"
Cohesion: 0.20
Nodes (9): IntakeCamera, IntakeCameraHandle, IntakeCameraProps, IntakeCaptureChrome(), IntakeCaptureChromeProps, IntakeCaptureDock(), IntakeCaptureDockProps, IntakeSessionDone() (+1 more)

### Community 10 - "intake-capture-chrome.tsx"
Cohesion: 0.33
Nodes (5): IntakeCreateIdentityDraft, IntakeCreateSerialSheet, IntakeCreateSerialSheetProps, IntakeCreateSerialSheetRef, styles

## Knowledge Gaps
- **21 isolated node(s):** `IntakeCameraProps`, `IntakeCaptureChromeProps`, `IntakeCaptureDockProps`, `IntakeCreateIdentityDraft`, `IntakeCreateSerialSheetProps` (+16 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useEngineIntakeJobs()` connect `use-engine-intake-data.ts` to `engine-intake-jobs-screen.tsx`, `intake-camera.tsx`, `engine-intake-session-screen.tsx`?**
  _High betweenness centrality (0.071) - this node is a cross-community bridge._
- **Why does `useEngineIntakeOutbox()` connect `intake-outbox.ts` to `engine-intake-jobs-screen.tsx`, `intake-camera.tsx`, `engine-intake-session-screen.tsx`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **Why does `IntakeJobRow()` connect `intake-job-row.tsx` to `engine-intake-jobs-screen.tsx`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `EngineIntakeJobsScreen()` (e.g. with `sortJobs()` and `getEngineIntakeDeviceId()`) actually correct?**
  _`EngineIntakeJobsScreen()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `IntakeCameraProps`, `IntakeCaptureChromeProps`, `IntakeCaptureDockProps` to the rest of the system?**
  _21 weakly-connected nodes found - possible documentation gaps or missing edges._