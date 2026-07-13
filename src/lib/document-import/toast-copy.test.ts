import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { DocumentImportJob } from "@/domain/document-import";
import { formatDocumentImportToastCopy } from "@/lib/document-import/toast-copy";

function job(partial: Partial<DocumentImportJob>): DocumentImportJob {
  return {
    id: "1",
    companyId: "c",
    createdBy: "u",
    status: "ready",
    originalStoragePath: "",
    originalDownloadUrl: "",
    previewStoragePath: null,
    previewDownloadUrl: null,
    contentType: "image/jpeg",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...partial,
  };
}

describe("formatDocumentImportToastCopy", () => {
  it("hides UUID camera filenames", () => {
    const copy = formatDocumentImportToastCopy(
      job({
        fileName: "80F530C9-EFA7-4FDB-9060-5F6BC06FE5EB.jpg",
        byteSize: 2_400_000,
      }),
    );
    assert.equal(copy.title, "Фото с телефона");
    assert.match(copy.description, /Готово к просмотру/);
    assert.match(copy.description, /МБ/);
    assert.doesNotMatch(copy.description, /80F530C9/i);
  });

  it("keeps human file names", () => {
    const copy = formatDocumentImportToastCopy(
      job({ fileName: "Накладная Toyota.jpg", contentType: "image/jpeg" }),
    );
    assert.match(copy.description, /Накладная Toyota/);
  });
});
