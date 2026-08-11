/**
 * State model for the AutoCore intelligent layer.
 *
 * One vocabulary drives the sidebar glyph, the entry button and the workspace
 * header, so the same signal is readable wherever the AI surfaces.
 */
export type AssistantState =
  | "idle"
  | "hover"
  | "active"
  | "thinking"
  | "working"
  | "success"
  | "error";

/** States that mean a request is in flight and must not be interrupted by hover. */
export const ASSISTANT_BUSY_STATES: readonly AssistantState[] = ["active", "thinking", "working"];

export function isAssistantBusy(state: AssistantState): boolean {
  return ASSISTANT_BUSY_STATES.includes(state);
}

/** Transient states auto-return to idle after this many ms. */
export const ASSISTANT_TRANSIENT_MS: Partial<Record<AssistantState, number>> = {
  success: 480,
  error: 620,
};

/**
 * Pointer-driven states never win over a live request — hover must not cancel
 * a `thinking` glyph, and leaving the button must not clear an error.
 */
export function resolvePointerState(
  current: AssistantState,
  pointer: "enter" | "leave",
): AssistantState {
  if (isAssistantBusy(current) || current === "success" || current === "error") {
    return current;
  }
  return pointer === "enter" ? "hover" : "idle";
}

/*
 * There is deliberately no phase model here.
 *
 * A previous version exposed `AssistantPhase` ("context" → "reasoning" →
 * "composing") which the provider advanced with a hardcoded `setTimeout`,
 * independent of what the model was doing. Progress now comes from the stream
 * itself: tool parts say what is actually being read, and `thinking` is set
 * only while a real request is in flight.
 */
