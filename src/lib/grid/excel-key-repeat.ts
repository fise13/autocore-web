/** Excel-like keyboard hold: pause, then keep stepping. */
export const EXCEL_KEY_REPEAT_DELAY_MS = 400;
export const EXCEL_KEY_REPEAT_INTERVAL_MS = 40;

export type ExcelArrowKey = "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight";

export function isExcelArrowKey(key: string): key is ExcelArrowKey {
  return key === "ArrowUp" || key === "ArrowDown" || key === "ArrowLeft" || key === "ArrowRight";
}

export type ExcelKeyRepeatController = {
  /** First keydown: run step immediately, schedule repeat. Browser repeats are ignored. */
  onArrowKeyDown: (key: ExcelArrowKey, step: () => void) => void;
  onArrowKeyUp: (key: string) => void;
  clear: () => void;
};

/**
 * Hold-to-navigate like Excel: first move, then delay, then fast repeat.
 * Uses selectionRef-style step callbacks so each tick reads fresh state.
 */
export function createExcelKeyRepeatController(): ExcelKeyRepeatController {
  let activeKey: ExcelArrowKey | null = null;
  let delayTimer: ReturnType<typeof setTimeout> | null = null;
  let intervalTimer: ReturnType<typeof setInterval> | null = null;
  let stepFn: (() => void) | null = null;

  function clearTimers() {
    if (delayTimer != null) {
      clearTimeout(delayTimer);
      delayTimer = null;
    }
    if (intervalTimer != null) {
      clearInterval(intervalTimer);
      intervalTimer = null;
    }
  }

  function clear() {
    clearTimers();
    activeKey = null;
    stepFn = null;
  }

  function startRepeat() {
    if (!stepFn) return;
    clearTimers();
    intervalTimer = setInterval(() => {
      stepFn?.();
    }, EXCEL_KEY_REPEAT_INTERVAL_MS);
  }

  return {
    onArrowKeyDown(key, step) {
      // Same key held — browser fires event.repeat; we drive motion ourselves.
      if (activeKey === key) return;

      clear();
      activeKey = key;
      stepFn = step;
      step();
      delayTimer = setTimeout(startRepeat, EXCEL_KEY_REPEAT_DELAY_MS);
    },
    onArrowKeyUp(key) {
      if (!isExcelArrowKey(key)) return;
      if (activeKey !== key) return;
      clear();
    },
    clear,
  };
}
