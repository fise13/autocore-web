# Graph Report - autocore-mobile/features/engine-intake  (2026-08-11)

## Corpus Check
- 19 files · ~9,407 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 111 nodes · 247 edges · 8 communities
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
- intake-job-row.tsx
- intake-camera.tsx

## God Nodes (most connected - your core abstractions)
1. `EngineIntakeJobsScreen()` - 15 edges
2. `EngineIntakeSessionScreen()` - 14 edges
3. `drain()` - 12 edges
4. `publish()` - 11 edges
5. `engineIntakeId()` - 10 edges
6. `useEngineIntakeOutbox()` - 10 edges
7. `useEngineIntakeJobs()` - 8 edges
8. `getEngineIntakeDeviceId()` - 8 edges
9. `drainIntakeOutbox()` - 8 edges
10. `sendOrQueueIntakeCommand()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `EngineIntakeJobsScreen()` --indirect_call--> `getEngineIntakeDeviceId()`  [INFERRED]
  autocore-mobile/features/engine-intake/engine-intake-jobs-screen.tsx → autocore-mobile/features/engine-intake/lib/device.ts
- `EngineIntakeJobsScreen()` --calls--> `useEngineIntakeJobs()`  [EXTRACTED]
  autocore-mobile/features/engine-intake/engine-intake-jobs-screen.tsx → autocore-mobile/features/engine-intake/hooks/use-engine-intake-data.ts
- `EngineIntakeJobsScreen()` --calls--> `engineIntakeId()`  [EXTRACTED]
  autocore-mobile/features/engine-intake/engine-intake-jobs-screen.tsx → autocore-mobile/features/engine-intake/lib/device.ts
- `EngineIntakeJobsScreen()` --calls--> `openEngineIntakeSession()`  [EXTRACTED]
  autocore-mobile/features/engine-intake/engine-intake-jobs-screen.tsx → autocore-mobile/features/engine-intake/lib/open-engine-intake.ts
- `EngineIntakeJobsScreen()` --calls--> `sendOrQueueIntakeCommand()`  [EXTRACTED]
  autocore-mobile/features/engine-intake/engine-intake-jobs-screen.tsx → autocore-mobile/features/engine-intake/store/intake-outbox.ts

## Import Cycles
- None detected.

## Communities (8 total, 0 thin omitted)

### Community 0 - "engine-intake-jobs-screen.tsx"
Cohesion: 0.15
Nodes (19): IntakeCreateIdentityDraft, IntakeCreateSerialSheet, IntakeCreateSerialSheetProps, IntakeCreateSerialSheetRef, styles, IntakeOutboxBanner(), IntakeOutboxBannerProps, ACTIVE_STATES (+11 more)

### Community 1 - "intake-outbox.ts"
Cohesion: 0.14
Nodes (25): finalizeEngineIntakePhoto(), prepareEngineIntakePhoto(), sendEngineIntakeCommand(), clearFailedIntakeOutbox(), commandFailureBlocksJob(), drain(), errorMessage(), IntakeOutboxCommand (+17 more)

### Community 2 - "use-engine-intake-data.ts"
Cohesion: 0.22
Nodes (11): EngineIntakeLaunch(), IntakeLaunchCard(), EMPTY_JOB_DETAIL, JobDetailState, jobsCacheKey(), JobsState, useEngineIntakeJobs(), INTAKE_BAY (+3 more)

### Community 3 - "publish"
Cohesion: 0.60
Nodes (6): buildSnapshot(), countPendingCommands(), countPhotoFailed(), countPhotoPending(), isNoiseCommand(), snapshotForCompany()

### Community 4 - "evidence-labels.ts"
Cohesion: 0.43
Nodes (5): IntakeEvidenceChecklist(), Props, evidenceGuidance(), FACET_LABELS, missingEvidenceLabels()

### Community 6 - "intake-job-row.tsx"
Cohesion: 0.53
Nodes (5): IntakeJobRow(), IntakeJobRowProps, jobSerial(), jobSubtitle(), lifecycleBadgeVariant()

### Community 9 - "intake-camera.tsx"
Cohesion: 0.15
Nodes (19): IntakeCamera, IntakeCameraHandle, IntakeCameraProps, IntakeCaptureChrome(), IntakeCaptureChromeProps, IntakeCaptureDock(), IntakeCaptureDockProps, IntakeSessionDone() (+11 more)

## Knowledge Gaps
- **22 isolated node(s):** `IntakeCameraProps`, `IntakeCaptureChromeProps`, `IntakeCaptureDockProps`, `IntakeCreateIdentityDraft`, `IntakeCreateSerialSheetProps` (+17 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useEngineIntakeJobs()` connect `use-engine-intake-data.ts` to `engine-intake-jobs-screen.tsx`, `intake-camera.tsx`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Why does `useEngineIntakeOutbox()` connect `engine-intake-jobs-screen.tsx` to `intake-camera.tsx`, `publish`, `intake-outbox.ts`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Why does `IntakeJobRow()` connect `intake-job-row.tsx` to `engine-intake-jobs-screen.tsx`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `EngineIntakeJobsScreen()` (e.g. with `sortJobs()` and `getEngineIntakeDeviceId()`) actually correct?**
  _`EngineIntakeJobsScreen()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `IntakeCameraProps`, `IntakeCaptureChromeProps`, `IntakeCaptureDockProps` to the rest of the system?**
  _22 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `intake-outbox.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.14245014245014245 - nodes in this community are weakly interconnected._
- **Should `intake-camera.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.14666666666666667 - nodes in this community are weakly interconnected._