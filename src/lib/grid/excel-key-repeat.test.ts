import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createExcelKeyRepeatController,
  EXCEL_KEY_REPEAT_DELAY_MS,
  EXCEL_KEY_REPEAT_INTERVAL_MS,
  isExcelArrowKey,
} from "./excel-key-repeat.ts";

describe("excel key repeat", () => {
  it("recognizes arrow keys", () => {
    assert.equal(isExcelArrowKey("ArrowDown"), true);
    assert.equal(isExcelArrowKey("Enter"), false);
  });

  it("steps once immediately, then repeats after delay", async () => {
    const controller = createExcelKeyRepeatController();
    let steps = 0;
    controller.onArrowKeyDown("ArrowDown", () => {
      steps += 1;
    });
    assert.equal(steps, 1);

    // Second keydown for same key (browser repeat) must not double-step.
    controller.onArrowKeyDown("ArrowDown", () => {
      steps += 1;
    });
    assert.equal(steps, 1);

    await new Promise((resolve) => setTimeout(resolve, EXCEL_KEY_REPEAT_DELAY_MS + EXCEL_KEY_REPEAT_INTERVAL_MS + 30));
    assert.ok(steps >= 2, `expected repeat steps, got ${steps}`);

    controller.onArrowKeyUp("ArrowDown");
    const afterUp = steps;
    await new Promise((resolve) => setTimeout(resolve, EXCEL_KEY_REPEAT_INTERVAL_MS * 2 + 20));
    assert.equal(steps, afterUp);
    controller.clear();
  });

  it("switching arrows restarts from a fresh first step", () => {
    const controller = createExcelKeyRepeatController();
    const keys: string[] = [];
    controller.onArrowKeyDown("ArrowDown", () => keys.push("down"));
    controller.onArrowKeyDown("ArrowRight", () => keys.push("right"));
    assert.deepEqual(keys, ["down", "right"]);
    controller.clear();
  });
});
