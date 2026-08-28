/**
 * Client photo pipeline for Engine intake.
 *
 * Zero-latency UX (this is the product contract, not a future plan):
 * 1. Shutter / picker writes the original to Documents and enqueues an
 *    outbox row with the local URI. The bay card appears immediately
 *    (`uploading` in overlay terms). Finish navigates away without waiting
 *    for Storage.
 * 2. `optimizeIntakePhotoFile` resizes to ≤1920 px and prefers WebP
 *    (JPEG 0.75 fallback). The camera keeps `skipProcessing: true` so the
 *    shutter stays instant — 4K/RAW never go on the wire if this wins the
 *    race (uploads `await` the same promise).
 * 3. `drainIntakeOutbox` runs `mapPool(PHOTO_UPLOAD_CONCURRENCY)`:
 *    prepare (signed URL) → PUT Storage → finalize (Firestore photo doc).
 *    That finalize is the download-URL write. Do **not** `arrayUnion`
 *    URLs from the client — the server transaction owns the photo document
 *    and AI inspection.
 * 4. Retry lives in the outbox scheduler (`waiting_for_network` /
 *    `retry_scheduled`). Offline does not burn attempts.
 *
 * Integration: `saveIntakePhotoLocally` on capture, `enqueueIntakeCommand`
 * (`field_complete`) + `openEngineIntakeBay` on Finish, `useIntakePhotoUploadProgress`
 * on the bay list.
 */

export {
  MAX_PHOTO_LONG_EDGE,
  MIN_COMPRESSIBLE_BYTES,
  PHOTO_JPEG_QUALITY,
  planPhotoCompression,
} from './photo-compression';
export { PHOTO_UPLOAD_CONCURRENCY, mapPool } from './intake-upload-pool';
export {
  fileNameForIntakePhoto,
  normalizeIntakePhotoPayload,
  rewritePhotoUriExtension,
} from './intake-photo-payload';
export { jobPhotoSyncByJobId, jobPhotoSyncProgress } from './job-photo-sync-progress';
export { pickUploadProgress, aggregateUploadProgress } from './upload-progress';
