# Graph Report - autocore-mobile/features/engine-intake  (2026-08-12)

## Corpus Check
- Corpus is ~10,977 words - fits in a single context window. You may not need a graph.

## Summary
- 107 nodes · 191 edges · 11 communities detected
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output
- Edge kinds: contains: 90 · calls: 43 · imports: 37 · imports_from: 19 · re_exports: 2


## Input Scope
- Requested: auto
- Resolved: committed (source: default-auto)
- Included files: 17 · Candidates: 17
- Excluded: 40 untracked · 0 ignored · 0 sensitive · 0 missing committed
- Recommendation: Use --scope all or graphify.yaml inputs.corpus for a knowledge-base folder.

## Graph Freshness
- Built from Git commit: `77c52f6`
- Compare this hash to `git rev-parse HEAD` before trusting freshness-sensitive graph output.
## God Nodes (most connected - your core abstractions)
1. `publish()` - 12 edges
2. `drain()` - 11 edges
3. `resolveFailedIntakeOutbox()` - 6 edges
4. `useEngineIntakeJobs()` - 5 edges
5. `engineIntakeId()` - 5 edges
6. `buildSnapshot()` - 5 edges
7. `drainIntakeOutbox()` - 5 edges
8. `purgeUnrecoverableIntakeOutbox()` - 5 edges
9. `snapshotForCompany()` - 5 edges
10. `sendOrQueueIntakeCommand()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `clearFailedIntakeOutbox()` --calls--> `publish()`  [EXTRACTED]
  store/intake-outbox.ts → store/intake-outbox.ts  _Bridges community 7 → community 4_
- `drain()` --calls--> `errorMessage()`  [EXTRACTED]
  store/intake-outbox.ts → store/intake-outbox.ts  _Bridges community 4 → community 10_
- `drain()` --calls--> `isTerminalError()`  [EXTRACTED]
  store/intake-outbox.ts → store/intake-outbox.ts  _Bridges community 4 → community 9_
- `publish()` --calls--> `buildSnapshot()`  [EXTRACTED]
  store/intake-outbox.ts → store/intake-outbox.ts  _Bridges community 4 → community 8_

## Communities

### Community 0 - "Community 0"
Cohesion: 0.13
Nodes (15): IntakeCreateIdentityDraft, IntakeCreateSerialSheet, IntakeCreateSerialSheetProps, IntakeCreateSerialSheetRef, SHEET_SPRING, styles, IntakeOutboxBanner(), IntakeOutboxBannerProps (+7 more)

### Community 1 - "Community 1"
Cohesion: 0.17
Nodes (9): IntakeCamera, IntakeCameraHandle, IntakeCameraProps, IntakeCaptureChrome(), IntakeCaptureChromeProps, IntakeCaptureDock(), IntakeCaptureDockProps, IntakeSessionDone() (+1 more)

### Community 2 - "Community 2"
Cohesion: 0.18
Nodes (9): finalizeEngineIntakePhoto(), prepareEngineIntakePhoto(), sendEngineIntakeCommand(), IntakeOutboxCommand, IntakeOutboxPhoto, IntakeOutboxSnapshot, listeners, PersistedOutbox (+1 more)

### Community 3 - "Community 3"
Cohesion: 0.25
Nodes (8): EngineIntakeLaunch(), IntakeLaunchCard(), EMPTY_JOB_DETAIL, JobDetailState, jobsCacheKey(), JobsState, useEngineIntakeJobDetail(), useEngineIntakeJobs()

### Community 4 - "Community 4"
Cohesion: 0.27
Nodes (10): commandFailureBlocksJob(), drain(), noteSyncSuccess(), publish(), removeIntakeOutboxItem(), resetSyncSession(), saveIntakePhotoLocally(), updateCommand() (+2 more)

### Community 5 - "Community 5"
Cohesion: 0.31
Nodes (6): IntakeJobRow(), IntakeJobRowBody(), IntakeJobRowProps, jobSerial(), jobSubtitle(), lifecycleBadgeVariant()

### Community 6 - "Community 6"
Cohesion: 0.38
Nodes (4): Props, evidenceGuidance(), FACET_LABELS, missingEvidenceLabels()

### Community 7 - "Community 7"
Cohesion: 0.29
Nodes (7): clearFailedIntakeOutbox(), drainIntakeOutbox(), isUnrecoverableOutboxError(), photoFileMissing(), purgeUnrecoverableIntakeOutbox(), resolveFailedIntakeOutbox(), retryIntakeOutboxItem()

### Community 8 - "Community 8"
Cohesion: 0.47
Nodes (6): buildSnapshot(), countPendingCommands(), countPhotoFailed(), countPhotoPending(), snapshotForCompany(), useEngineIntakeOutbox()

### Community 9 - "Community 9"
Cohesion: 0.67
Nodes (3): enqueueIntakeCommand(), isTerminalError(), sendOrQueueIntakeCommand()

### Community 10 - "Community 10"
Cohesion: 1.00
Nodes (2): errorMessage(), humanizeIntakeOutboxError()

## Knowledge Gaps
- **22 isolated node(s):** `IntakeCameraProps`, `IntakeCaptureChromeProps`, `IntakeCaptureDockProps`, `SHEET_SPRING`, `IntakeCreateSerialSheetProps` (+17 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 10`** (2 nodes): `errorMessage()`, `humanizeIntakeOutboxError()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useEngineIntakeJobs()` connect `Community 3` to `Community 0`, `Community 1`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **Why does `sendOrQueueIntakeCommand()` connect `Community 9` to `Community 0`, `Community 1`, `Community 2`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Why does `drainIntakeOutbox()` connect `Community 7` to `Community 0`, `Community 1`, `Community 2`, `Community 4`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **What connects `IntakeCameraProps`, `IntakeCaptureChromeProps`, `IntakeCaptureDockProps` to the rest of the system?**
  _22 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.12987012987012986 - nodes in this community are weakly interconnected._