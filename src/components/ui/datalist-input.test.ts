import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  cycleTabOption,
  getTabCycleCandidates,
  type DatalistOption,
} from "@/components/ui/datalist-input";

const employees: DatalistOption[] = [
  { value: "Виктор Мишкин", label: "Владелец" },
  { value: "Алексей Иванов", label: "Механик" },
  { value: "Мария Петрова", label: "Диагност" },
];

describe("datalist tab cycle", () => {
  it("cycles through all options when the current value is an exact match", () => {
    const next = cycleTabOption("Виктор Мишкин", employees, "flexible", 1);
    assert.equal(next, "Алексей Иванов");
  });

  it("cycles backwards with shift-tab direction", () => {
    const previous = cycleTabOption("Алексей Иванов", employees, "flexible", -1);
    assert.equal(previous, "Виктор Мишкин");
  });

  it("filters candidates while typing a prefix", () => {
    const candidates = getTabCycleCandidates("ал", employees, "flexible");
    assert.deepEqual(
      candidates.map((entry) => entry.value),
      ["Алексей Иванов"],
    );
  });
});
