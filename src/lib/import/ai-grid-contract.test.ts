import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  IMPORT_GRID_BASE_LAYER,
  isGridPlaceholder,
  joinGridFragments,
  sanitizeGridText,
} from "./ai-grid-contract.ts";

describe("grid placeholders", () => {
  it("treats the ways a spreadsheet says nothing as nothing", () => {
    for (const value of ["", "  ", "N/A", "n/a", "#N/A", "-", "—", "???", "нет", "null", "..."]) {
      assert.equal(isGridPlaceholder(value), true, JSON.stringify(value));
    }
  });

  it("does not blank real values", () => {
    for (const value of ["ГУР", "C090606", "0", "1", "SOLD", "N62 B44"]) {
      assert.equal(isGridPlaceholder(value), false, value);
    }
  });

  it("normalizes whitespace and empties placeholders", () => {
    assert.equal(sanitizeGridText("  ГУР, ГЕНЕРАТОР  "), "ГУР, ГЕНЕРАТОР");
    assert.equal(sanitizeGridText("N/A"), "");
    assert.equal(sanitizeGridText(null), "");
    assert.equal(sanitizeGridText(undefined), "");
  });
});

describe("grid fragments", () => {
  it("joins without duplicates or gaps", () => {
    assert.equal(joinGridFragments(["ГУР", "", null, "ГУР", "ГЕНЕРАТОР"]), "ГУР · ГЕНЕРАТОР");
  });

  it("splits already-joined values so merges do not repeat themselves", () => {
    assert.equal(
      joinGridFragments(["ПОСЛЕ ДЭНА · РЕМОНТ ДЭН", "РЕМОНТ ДЭН"]),
      "ПОСЛЕ ДЭНА · РЕМОНТ ДЭН",
    );
  });

  it("drops placeholders that arrive as fragments", () => {
    assert.equal(joinGridFragments(["ГУР", "N/A", "???"]), "ГУР");
  });
});

describe("base layer prompt", () => {
  it("states the rules the projectors enforce", () => {
    // The prompt and the code have to agree; if one of these disappears from the prompt the
    // model is no longer being told what the projector will do to its answer anyway.
    for (const rule of ["NEVER INVENT", "NEVER LOSE DATA", "empty string", "notes"]) {
      assert.ok(IMPORT_GRID_BASE_LAYER.includes(rule), rule);
    }
  });
});
