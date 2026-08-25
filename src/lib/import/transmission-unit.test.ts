import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  looksLikeTransmissionUnit,
  transmissionSignalFrom,
} from "@/lib/import/transmission-unit";

describe("looksLikeTransmissionUnit", () => {
  it("recognises the gearbox rows that ride along on an engine sheet", () => {
    for (const value of [
      "AKPP- TZ1A4- 40ZU",
      "АКПП- TZ1A4",
      "MKPP- 1234",
      "МКПП 5678",
      "CVT- JF011",
      "Вариатор JF016E",
      "КПП TR580",
    ]) {
      assert.equal(looksLikeTransmissionUnit(value), true, value);
    }
  });

  it("leaves engines alone", () => {
    for (const value of ["EJ251- 736084", "253AVCS- 810404", "1KZ- 0953316", "VK56- 306547"]) {
      assert.equal(looksLikeTransmissionUnit(value), false, value);
    }
  });

  it("does not demote an engine because a note mentions a gearbox", () => {
    // "с АКПП" describes the donor car, not the unit being sold.
    assert.equal(looksLikeTransmissionUnit("EJ253 с АКПП"), false);
    assert.equal(looksLikeTransmissionUnit("двигатель под АКПП"), false);
  });

  it("does not guess from an OEM gearbox serial on its own", () => {
    // TZ1A4 and TR580 overlap with engine-code shapes; demoting a real engine
    // to a part is worse than leaving one gearbox for a human to move.
    assert.equal(looksLikeTransmissionUnit("TZ1A4- 40ZU"), false);
    assert.equal(looksLikeTransmissionUnit("TR580DD5AA"), false);
  });

  it("ignores empty cells", () => {
    for (const value of ["", "   ", null, undefined]) {
      assert.equal(looksLikeTransmissionUnit(value), false, String(value));
    }
  });
});

describe("transmissionSignalFrom", () => {
  it("returns the first cell that names a gearbox", () => {
    assert.equal(transmissionSignalFrom(["EJ253", "AKPP- TZ1A4"]), "AKPP- TZ1A4");
  });

  it("returns null for a row of engines", () => {
    assert.equal(transmissionSignalFrom(["EJ253- C1", "полная"]), null);
  });
});
