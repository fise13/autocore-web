import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { sameGridScroll, snapGridScroll } from "@/lib/grid/scroll-window";

const xOffsets = [0, 44, 144, 254, 384];

describe("snapGridScroll", () => {
  it("snaps top to the row boundary and left to the column start", () => {
    const snapped = snapGridScroll({ top: 95, left: 150, width: 800, height: 600 }, 30, xOffsets);
    assert.equal(snapped.top, 90);
    assert.equal(snapped.left, 144);
    assert.equal(snapped.scrolledX, true);
  });

  it("keeps the same window while scrolling inside one row and column", () => {
    const a = snapGridScroll({ top: 61, left: 150, width: 800, height: 600 }, 30, xOffsets);
    const b = snapGridScroll({ top: 89, left: 253, width: 800, height: 600 }, 30, xOffsets);
    assert.ok(sameGridScroll(a, b));
  });

  it("changes once a column boundary is crossed", () => {
    const a = snapGridScroll({ top: 0, left: 253, width: 800, height: 600 }, 30, xOffsets);
    const b = snapGridScroll({ top: 0, left: 254, width: 800, height: 600 }, 30, xOffsets);
    assert.equal(sameGridScroll(a, b), false);
    assert.equal(b.left, 254);
  });

  it("reports horizontal scroll inside the first column", () => {
    const resting = snapGridScroll({ top: 0, left: 0, width: 800, height: 600 }, 30, xOffsets);
    const nudged = snapGridScroll({ top: 0, left: 3, width: 800, height: 600 }, 30, xOffsets);
    assert.equal(resting.scrolledX, false);
    assert.equal(nudged.scrolledX, true);
    assert.equal(nudged.left, 0);
  });

  it("produces the same visible column start as the unsnapped offset", () => {
    const widths = [44, 100, 110, 130, 90];
    const colStartFor = (left: number) => {
      let col = 0;
      let x = 0;
      while (col < widths.length && x + widths[col] <= left) {
        x += widths[col];
        col += 1;
      }
      return col;
    };
    for (let left = 0; left < 470; left += 7) {
      const snapped = snapGridScroll({ top: 0, left, width: 800, height: 600 }, 30, xOffsets);
      assert.equal(colStartFor(snapped.left), colStartFor(left), `left=${left}`);
    }
  });
});
