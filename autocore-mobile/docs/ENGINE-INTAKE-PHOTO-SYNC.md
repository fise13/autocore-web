# Engine intake photo sync

How a photo gets from the shutter to Storage, what guarantees each layer gives,
and what still has to be checked on a real device.

## Pipeline

```
CameraView.takePictureAsync
  → saveIntakePhotoLocally()        Documents/engine-intake/{companyId}/{jobId}/{photoId}.jpg
  → outbox row (persisted, MMKV)    engine-intake:outbox:v2
  → optimizeQueuedPhoto()           best-effort, only while status === 'queued'
  → drain()
      → POST /photos/prepare        Firestore row + signed upload URL
      → PUT  signed URL             iOS background URLSession, file-based
      → POST /photos/finalize       syncState → synced, job progress recomputed
  → local file deleted              only after the server confirms a URL
```

The capture is durable and queued before anything else happens. Every later
step is a retry away from where it stopped, and no step deletes the local file
until the server has confirmed the photo.

## Layer boundaries

| Layer | Owns | Where |
| --- | --- | --- |
| React Native | capture UI, queue display, progress display, user actions | `engine-intake-session-screen.tsx`, `intake-outbox-banner.tsx` |
| Persistent queue | upload state, retry schedule, reconciliation | `store/intake-outbox.ts`, `lib/sync-schedule.ts` |
| Native iOS | the transfer itself, after the JS runtime is gone | `expo-file-system` background `URLSession` |
| Backend | authorization, Storage, metadata, idempotency, final state | `intake-photo.server.ts`, `intake-photo-storage.server.ts` |

The JS runtime is **not** required for an already-started transfer to finish.
It is required to start the next one and to run finalize, which is why the
queue is persisted and re-drained on launch, on foreground, on any NetInfo
event, and from a `BGProcessingTask`.

## Why the background session, always

`expo-file-system` configures its iOS background session the way Apple requires
for transfers that outlive the process:

- `URLSessionConfiguration.background(withIdentifier:)` with a stable
  identifier derived from the bundle id
- `sessionSendsLaunchEvents = true`
- `isDiscretionary = false`
- an `application(_:handleEventsForBackgroundURLSession:completionHandler:)`
  app-delegate subscriber (`FileSystemBackgroundSessionHandler`)
- `uploadTask(with:fromFile:)` — a file body, not `fromData`, which is the only
  form that remains valid once the app process has been terminated

`resolvePhotoUploadSession()` therefore returns `background` on iOS
unconditionally. It deliberately takes no app-state argument: what the app is
doing at the moment a task is created says nothing about where it will be a
second later.

What the background session does **not** give back is the JS promise. After a
relaunch the transfer may already have completed with no JS alive to see it —
handled by the resume path below.

## Resume after the app dies mid-upload

The upload is two network steps and only the first survives the process:

1. **PUT** the bytes — background URLSession, outlives the app.
2. **POST finalize** — an ordinary request from the JS runtime, does not.

So a kill between them leaves a complete object in Storage whose Firestore row
never reached `synced`. `prepare` probes the object
(`readIntakePhotoStorageState`) and, when its size matches what this attempt is
about to send, returns `alreadyUploaded: true` so the retry goes straight to
finalize instead of re-sending the file. A 0-byte placeholder, a missing
object, or a size mismatch all fall back to a full re-upload, which is always
safe.

## Idempotency

The queue row id is the idempotency key. The server derives the Firestore
document id from it (`sha256(idempotencyKey)` truncated) and creates that
document with `transaction.create`, so a replayed request cannot produce a
second photo. A key presented with a different uid, device, or session is
rejected with 409 rather than silently rebound.

## Compression

Deliberately conservative, because these photos feed serial-plate OCR, engine
identification, and component detection:

- only downscale, never upscale
- long edge 3072 px, quality 0.85
- files under 900 KB, or already within the target, are left completely
  untouched — a second re-encode can only lose detail
- the replacement is kept only if it saves at least 10%
- any failure leaves the captured original in place and uploadable

It runs *after* the photo is durable and queued, never in front of the shutter,
and skips any row that is no longer `queued` — swapping the file under a
running URLSession task would upload one image and finalize against another.

## Progress

Byte progress is the one piece of upload state that is **not** persisted: it
changes ~10x/second per task and is meaningless after a relaunch. The queue
owns *status*; `store/intake-upload-progress.ts` is a throwaway in-memory
overlay of *bytes*, throttled to 250 ms per photo, cleared when a transfer
settles either way.

## Device acceptance tests

These cannot run in CI — they need a real iPhone, a Release build, and manual
lifecycle events. Run them against a build that includes
`expo-image-manipulator` (added with this change, so a native rebuild is
required) after `npx expo prebuild -p ios --clean`.

Watch Firestore at
`companies/{companyId}/engineIntakeJobs/{jobId}/photos` and the bucket at
`companies/{companyId}/engine-intake/{jobId}/`.

| # | Scenario | Pass condition |
| --- | --- | --- |
| 1 | Take 1 photo → Save → lock the iPhone immediately → wait 2 min | Object in Storage, row `syncState: synced` |
| 2 | Take 10 photos → Save → swipe the app away at once | All 10 objects land; reopening shows no pending rows |
| 3 | Take photos → Airplane Mode → Save → wait → re-enable network | Rows sit in `waiting_for_network`, then upload with no user action |
| 4 | Take photo → upload starts → kill the app → reopen | Exactly one photo row; no duplicate; no second full upload (check egress) |
| 5 | Point the API at a 500 | Row goes `retry_scheduled` with a growing `nextRetryAt`; no tight loop |
| 6 | Force a 401 (revoke the token) | Row is `failed` with `AUTH_EXPIRED`, local file kept, retry after re-auth succeeds |
| 7 | Replay the same prepare+finalize twice | One Firestore row, one Storage object |
| 8 | Cancel the intake while photos are pending | Local files and rows dropped; see the known gap below |

## Continue never blocks on the network

Tapping Continue (or Open camera) writes the optimistic claim, the job and the
session into the persisted overlay **synchronously**, then routes straight to
the camera. The `claim_job` command is sent afterwards, in the background.

It used to `await` that command before opening. Two things went wrong with
that:

- **Starvation.** The claim POST competes for the pipe with up to four
  parallel photo uploads, so during a sync wave Continue spun for seconds —
  and `starting` disabled every row in the bay while it did.
- **False fatality.** `EngineIntakeCommandError` defaults to **409**, and
  `isTerminalError` rethrows any 4xx except 408/429. So the ordinary "the
  previous Finish has not synced yet, the old session is still active" answer
  came back as *"Engine could not be opened"*.

`resolveClaimOutcome` now decides what a claim failure means for the person
who tapped. Only two answers take the camera away again:

| Answer | Outcome |
| --- | --- |
| Another worker holds the bay (`claimed by`, `assigned to another`) | blocked |
| Role cannot execute intake (403) | blocked |
| `Job cannot be claimed while {state}` | blocked |
| Offline, timeout, 5xx, 429, 401, and the rest of the 409 family | **queued** — camera opens, drain settles the claim |

The session screen's gate was widened to match: it used to require a
`claim_job` row in the outbox, which only exists once a claim has already
*failed*. It now also accepts a session id the optimistic overlay holds
(`canShowSessionForLocalClaim`), which covers the window between opening the
camera and the claim reaching the server.

Photos are safe on the device under every one of these paths, so refusing to
open the camera could only ever lose work.

## Upload latency

Two costs were removed:

- **The re-encode never used to win its race.** `ingestPhotoUris` kicks a
  drain on the next frame; a re-encode takes 100–300 ms. The drain always got
  there first, flipped the row to `uploading`, and the optimizer skipped it —
  so the compression added earlier was, in practice, dead code on any usable
  connection and full-resolution frames went over the wire every time. Uploads
  now await the re-encode **of the photo they are about to send** (never of
  other photos, so one slow re-encode cannot stall the wave).
- **Two Storage round-trips per photo, in the request the device waits on.**
  `prepareIntakePhotoUpload` called `exists()` and then wrote a 0-byte
  placeholder object, purely to reserve a path that is already deterministic.
  A v4 signed URL is computed locally from the service-account key and needs
  neither. On a twelve-photo bay walk that is two dozen round-trips the worker
  waited through before any image byte could move.

### Not fixed: Firestore contention on the job document

The likely dominant cost is still in the backend and was left alone on
purpose, because fixing it properly changes progress semantics and wants a
measurement first.

Every `prepare` **and** every `finalize` runs a transaction that reads the
whole `photos` subcollection and writes the single `jobRef` document
(`progress`, `documentationChecklist`, `revision` increment). With
`PHOTO_UPLOAD_CONCURRENCY = 4` that is eight transactions per four photos, all
contending on one document — and Firestore sustains roughly one write per
second to a single document, retrying the losers with backoff. For a
twelve-photo session: 24 contended transactions, each reading N photo
documents, so O(N²) reads overall.

Worth noting that raising the upload concurrency would make this *worse*, not
better.

Candidate fixes, in order of preference:

1. Stop recomputing job progress inside `prepare`. It exists to include a
   not-yet-uploaded photo in the checklist, which mainly matters at Finish.
   Verify first whether requirement gating counts `queued` photos — if it
   does, moving this changes when Finish unlocks.
2. Debounce progress recomputation into a Firestore trigger on the photos
   subcollection, so the per-photo request path writes only its own document.
3. Failing both, lower prepare/finalize concurrency (not PUT concurrency) so
   transactions stop colliding, and measure.

Measure before choosing: instrument transaction retry counts and p95 duration
of `prepare` and `finalize` on a twelve-photo session.

## Known gaps

- **Test 8 leaves server-side orphans.** `discardIntakeWorkForCancelledJob`
  deletes the local files and drops the queue rows, but photos that already
  reached `prepare` have a Firestore row and a Storage object that `cancel_job`
  does not clean up. Cleanup needs a product decision on whether a cancelled
  intake's photos are retained for audit or deleted, so it is not resolved
  here.
- **Android** has no equivalent background transfer; uploads there stop when
  the process does and resume on next launch from the persisted queue.
