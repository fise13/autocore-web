import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  autocompleteSuffixForMatch,
  pickColumnAutocompleteMatch,
  resolveGridColumnAutocomplete,
} from "./grid-column-autocomplete.ts";

describe("grid column autocomplete", () => {
  it("picks first column match by prefix", () => {
    assert.equal(pickColumnAutocompleteMatch("Toy", ["Toyota", "BMW", "Toyo"]), "Toyota");
    assert.equal(pickColumnAutocompleteMatch("bm", ["Toyota", "BMW"]), "BMW");
    assert.equal(pickColumnAutocompleteMatch("Aud", ["Toyota", "BMW"]), null);
  });

  it("builds suffix for ghost text", () => {
    assert.equal(autocompleteSuffixForMatch("Toy", "Toyota"), "ota");
    assert.equal(autocompleteSuffixForMatch("Toyota", "Toyota"), "");
  });

  it("collects candidates from other rows in the same column", () => {
    const match = resolveGridColumnAutocomplete(
      { cell: { row: 0, column: 2 }, value: "Mer" },
      3,
      (row, column) => {
        const table = [
          ["", "", "BMW"],
          ["", "", "Mercedes"],
          ["", "", "Audi"],
        ];
        return table[row]?.[column] ?? "";
      },
    );
    assert.equal(match, "Mercedes");
  });
});
