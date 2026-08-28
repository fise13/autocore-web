import * as functions from "firebase-functions/v1";

/**
 * Close out an intake photo the moment its bytes land in the bucket.
 *
 * On iOS the PUT runs on a background URLSession, so it finishes whether or not
 * the app is still alive — but `finalize` is an ordinary request from the JS
 * runtime, and that dies with the app. The result was a complete object in
 * Storage whose Firestore row sat at `syncing` until the worker happened to
 * reopen the app, sometimes the next morning.
 *
 * The trigger is the only participant that is guaranteed to be running at the
 * moment the object appears, so it is the one that finishes the row. It does no
 * reasoning of its own: the app route owns the path grammar, the ownership
 * rules and the idempotency, exactly as it does for a device-driven finalize.
 */
const intakeFunctions = functions.region("us-central1").runWith({
  timeoutSeconds: 60,
  memory: "256MB",
});

/** Cheap pre-filter so the bucket's other traffic never leaves the function. */
const INTAKE_PHOTO_PATH = /^companies\/[^/]+\/engine-intake\/[^/]+\/[^/]+\.(jpg|png|webp|heic|heif)$/i;

function appOrigin(): string {
  return (
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://app.myautocore.com"
  ).replace(/\/$/, "");
}

function workerSecret(): string | null {
  const secret = process.env.INTAKE_PHOTO_WORKER_SECRET?.trim();
  return secret || null;
}

export const onIntakePhotoUploaded = intakeFunctions.storage
  .object()
  .onFinalize(async (object) => {
    const storagePath = object.name ?? "";
    if (!INTAKE_PHOTO_PATH.test(storagePath)) return;
    // A 0-byte object is a path reservation, not a photo.
    if (!Number(object.size ?? 0)) return;

    const secret = workerSecret();
    if (!secret) {
      console.warn("[onIntakePhotoUploaded] INTAKE_PHOTO_WORKER_SECRET is not set");
      return;
    }

    const response = await fetch(
      `${appOrigin()}/api/engine-intake/photos/auto-finalize`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-intake-photo-worker-key": secret,
        },
        body: JSON.stringify({ storagePath }),
      },
    );

    if (response.status === 400 || response.status === 401) {
      // Retrying a rejected request only burns quota — surface it instead.
      console.error(
        `[onIntakePhotoUploaded] auto-finalize rejected (${response.status})`,
        storagePath,
      );
      return;
    }
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      // Throwing asks Cloud Functions to retry, which is what a 5xx deserves:
      // the bytes are in the bucket and the row still has to be closed.
      throw new Error(`auto-finalize failed (${response.status}): ${text}`);
    }
  });
