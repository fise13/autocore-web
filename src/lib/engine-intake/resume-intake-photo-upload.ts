/**
 * Whether a photo's bytes are already in Storage, so a retry can go straight
 * to finalize instead of re-sending the file.
 *
 * The gap this closes: `prepare` used to report `alreadyUploaded` only once
 * Firestore said `syncState === "synced"`, which is set by `finalize`. The
 * upload is two network steps — PUT the bytes onto a signed URL, then POST
 * finalize — and only the PUT survives the app process dying, because it runs
 * on the iOS background URLSession while finalize is an ordinary request from
 * the JS runtime. So the ordinary "user shot ten photos and swiped the app
 * away" case leaves ten complete objects in Storage whose rows never reached
 * `synced`, and the next launch re-sent every byte of them over cellular.
 *
 * Pure — no Storage client, no Firestore — so the decision is testable on its
 * own and the I/O stays at the call site.
 */

export type IntakePhotoStorageState = {
  /** Whether an object exists at the prepared path at all. */
  exists: boolean;
  /** Size of that object. A prepared-but-unsent photo is a 0-byte placeholder. */
  sizeBytes: number;
};

export type ResumeDecision =
  | { action: "finalize"; reason: "already-uploaded" }
  | { action: "upload"; reason: "no-object" | "placeholder" | "size-mismatch" };

/**
 * `expectedBytes` is what the device says the local file weighs.
 *
 * A signed-URL PUT to GCS is atomic — a half-finished transfer never becomes a
 * visible object — so a non-empty object means some PUT completed. It is still
 * only accepted when its size matches what this attempt is about to send:
 * a re-encoded or replaced local file has to go up again, and treating a
 * stale object as current would attach the wrong image to the intake.
 */
export function resolvePhotoUploadResume(input: {
  storage: IntakePhotoStorageState;
  expectedBytes: number;
}): ResumeDecision {
  const { storage, expectedBytes } = input;
  if (!storage.exists) return { action: "upload", reason: "no-object" };
  if (!Number.isFinite(storage.sizeBytes) || storage.sizeBytes <= 0) {
    // `prepareIntakePhotoUpload` writes a 0-byte object to hold the path.
    return { action: "upload", reason: "placeholder" };
  }
  if (!Number.isFinite(expectedBytes) || expectedBytes <= 0) {
    return { action: "upload", reason: "size-mismatch" };
  }
  if (storage.sizeBytes !== expectedBytes) {
    return { action: "upload", reason: "size-mismatch" };
  }
  return { action: "finalize", reason: "already-uploaded" };
}
