import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolvePhotoUploadResume } from "@/lib/engine-intake/resume-intake-photo-upload";

describe("resolvePhotoUploadResume", () => {
  it("skips the re-upload when the bytes already landed", () => {
    // The app was killed between the background PUT and finalize.
    const decision = resolvePhotoUploadResume({
      storage: { exists: true, sizeBytes: 1_048_576 },
      expectedBytes: 1_048_576,
    });
    assert.deepEqual(decision, { action: "finalize", reason: "already-uploaded" });
  });

  it("uploads when nothing is at the prepared path", () => {
    const decision = resolvePhotoUploadResume({
      storage: { exists: false, sizeBytes: 0 },
      expectedBytes: 1_000,
    });
    assert.deepEqual(decision, { action: "upload", reason: "no-object" });
  });

  it("does not mistake the 0-byte placeholder for an upload", () => {
    // prepareIntakePhotoUpload writes an empty object to reserve the path.
    const decision = resolvePhotoUploadResume({
      storage: { exists: true, sizeBytes: 0 },
      expectedBytes: 1_000,
    });
    assert.deepEqual(decision, { action: "upload", reason: "placeholder" });
  });

  it("re-uploads when the local file no longer matches the stored object", () => {
    const decision = resolvePhotoUploadResume({
      storage: { exists: true, sizeBytes: 900 },
      expectedBytes: 1_000,
    });
    assert.deepEqual(decision, { action: "upload", reason: "size-mismatch" });
  });

  it("re-uploads rather than trusting an unusable expected size", () => {
    for (const expectedBytes of [0, -1, Number.NaN]) {
      assert.equal(
        resolvePhotoUploadResume({
          storage: { exists: true, sizeBytes: 1_000 },
          expectedBytes,
        }).action,
        "upload",
      );
    }
  });
});
