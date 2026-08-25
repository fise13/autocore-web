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

## Known gaps

- **Test 8 leaves server-side orphans.** `discardIntakeWorkForCancelledJob`
  deletes the local files and drops the queue rows, but photos that already
  reached `prepare` have a Firestore row and a Storage object that `cancel_job`
  does not clean up. Cleanup needs a product decision on whether a cancelled
  intake's photos are retained for audit or deleted, so it is not resolved
  here.
- **Android** has no equivalent background transfer; uploads there stop when
  the process does and resume on next launch from the persisted queue.
