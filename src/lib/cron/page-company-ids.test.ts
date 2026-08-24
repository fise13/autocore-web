import assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("pageAllCompanyIds contract", () => {
  it("pages until a short batch, never dropping companies past the first 200", () => {
    const pageSize = 200;
    const total = 450;
    const pages: number[][] = [];
    let offset = 0;
    while (offset < total) {
      const end = Math.min(offset + pageSize, total);
      pages.push(Array.from({ length: end - offset }, (_, i) => offset + i));
      offset = end;
    }
    assert.equal(pages.length, 3);
    assert.equal(pages.flat().length, total);
    assert.equal(pages[0]?.length, 200);
    assert.equal(pages[2]?.length, 50);
  });
});
