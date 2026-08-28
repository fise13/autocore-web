import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isIntakePhotoStoragePath,
  parseIntakePhotoStoragePath,
} from "./intake-photo-storage-path";

describe("parseIntakePhotoStoragePath", () => {
  it("reads back the path prepare minted", () => {
    assert.deepEqual(
      parseIntakePhotoStoragePath("companies/acme/engine-intake/job_1/photo_1.jpg"),
      { companyId: "acme", jobId: "job_1", photoId: "photo_1", extension: "jpg" },
    );
  });

  it("accepts every extension the upload validator allows", () => {
    for (const extension of ["jpg", "png", "webp", "heic", "heif"]) {
      assert.ok(
        parseIntakePhotoStoragePath(`companies/acme/engine-intake/j/p.${extension}`),
        extension,
      );
    }
  });

  it("normalizes the extension case", () => {
    assert.equal(
      parseIntakePhotoStoragePath("companies/acme/engine-intake/j/p.JPG")?.extension,
      "jpg",
    );
  });

  it("refuses the rest of the bucket", () => {
    // The trigger sees every object in the project. Guessing at one of these
    // would write a photo row for a company logo.
    for (const path of [
      "companies/acme/logo.png",
      "companies/acme/documents/job_1/photo_1.jpg",
      "companies/acme/engine-intake/job_1/nested/photo_1.jpg",
      "companies/acme/engine-intake/job_1/photo_1.pdf",
      "companies//engine-intake/job_1/photo_1.jpg",
      "companies/acme/engine-intake/job_1/.jpg",
      "companies/acme/engine-intake/job_1/photo_1",
      "",
    ]) {
      assert.equal(parseIntakePhotoStoragePath(path), null, path);
    }
  });
});

describe("isIntakePhotoStoragePath", () => {
  it("agrees with the parser", () => {
    assert.equal(
      isIntakePhotoStoragePath("companies/acme/engine-intake/job_1/photo_1.heic"),
      true,
    );
    assert.equal(isIntakePhotoStoragePath("companies/acme/logo.png"), false);
  });
});
