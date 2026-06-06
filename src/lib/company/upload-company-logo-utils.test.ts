import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  assertLogoUpload,
  buildFirebaseStorageDownloadUrl,
  inferLogoContentType,
  isStorageBucketMissingError,
} from "./upload-company-logo-utils.ts";

describe("logo upload helpers", () => {
  it("infers mime type from file extension when browser sends octet-stream", () => {
    assert.equal(inferLogoContentType("application/octet-stream", "logo.png"), "image/png");
    assert.equal(inferLogoContentType("", "brand-logo.webp"), "image/webp");
  });

  it("validates supported logo uploads", () => {
    const parsed = assertLogoUpload({ size: 1024, type: "application/octet-stream", name: "logo.jpg" });
    assert.equal(parsed.extension, "jpg");
    assert.equal(parsed.contentType, "image/jpeg");
  });

  it("builds firebase storage download url", () => {
    const url = buildFirebaseStorageDownloadUrl(
      "autocore.appspot.com",
      "companies/default/branding/logo.png",
      "token-1",
    );
    assert.match(url, /firebasestorage\.googleapis\.com/);
    assert.match(url, /token=token-1/);
  });

  it("detects missing bucket errors", () => {
    assert.equal(isStorageBucketMissingError({ code: 404, message: "The specified bucket does not exist." }), true);
    assert.equal(isStorageBucketMissingError(new Error("bucket does not exist")), true);
    assert.equal(
      isStorageBucketMissingError(new Error("Firebase Storage bucket не найден. Проверены: test.appspot.com")),
      true,
    );
    assert.equal(isStorageBucketMissingError({ response: { statusCode: 404 } }), true);
    assert.equal(isStorageBucketMissingError(new Error("permission denied")), false);
  });
});
