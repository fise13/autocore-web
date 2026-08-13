import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildClearWrites } from "@/lib/grid/excel-clipboard";
import { parseGridPhotoUrls, serializeGridPhotoUrls } from "@/lib/grid/photo-urls";

describe("grid photo urls", () => {
  it("round-trips url lists for undo payloads", () => {
    const urls = ["https://a.example/1.jpg", "https://a.example/2.jpg"];
    assert.equal(serializeGridPhotoUrls(urls), "https://a.example/1.jpg\nhttps://a.example/2.jpg");
    assert.deepEqual(parseGridPhotoUrls(serializeGridPhotoUrls(urls)), urls);
    assert.deepEqual(parseGridPhotoUrls(""), []);
    assert.deepEqual(parseGridPhotoUrls("  \n  "), []);
  });

  it("builds clear writes for photo columns via isClearableColumn", () => {
    const writes = buildClearWrites({
      ranges: [{ minRow: 0, maxRow: 0, minColumn: 3, maxColumn: 3 }],
      valueAt: (row, column) => (row === 0 && column === 3 ? "https://a.example/1.jpg" : ""),
      isEditableColumn: (column) => column === 3,
    });
    assert.deepEqual(writes, [{ row: 0, column: 3, value: "" }]);
  });
});
