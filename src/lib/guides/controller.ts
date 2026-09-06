import {
  INITIAL_GUIDE_STATE,
  type GuideDefinition,
  type GuideEvent,
  type GuideState,
} from "@/lib/guides/types";

export function findGuide(
  guides: readonly GuideDefinition[],
  guideId: string | null | undefined,
): GuideDefinition | null {
  if (!guideId) return null;
  return guides.find((guide) => guide.id === guideId) ?? null;
}

export function reduceGuideState(
  state: GuideState,
  event: GuideEvent,
  guides: readonly GuideDefinition[],
): GuideState {
  switch (event.type) {
    case "start": {
      const guide = findGuide(guides, event.guideId);
      if (!guide || guide.steps.length === 0) return state;
      return {
        status: "active",
        guideId: guide.id,
        stepIndex: 0,
        wrongClick: false,
        showMe: false,
      };
    }
    case "complete-step": {
      if (state.status !== "active" || !state.guideId) return state;
      const guide = findGuide(guides, state.guideId);
      if (!guide) return INITIAL_GUIDE_STATE;
      const nextIndex = state.stepIndex + 1;
      if (nextIndex >= guide.steps.length) {
        return {
          ...state,
          status: "completed",
          stepIndex: guide.steps.length - 1,
          wrongClick: false,
          showMe: false,
        };
      }
      return {
        ...state,
        stepIndex: nextIndex,
        wrongClick: false,
        showMe: false,
      };
    }
    case "back": {
      if (state.status !== "active") return state;
      return {
        ...state,
        stepIndex: Math.max(0, state.stepIndex - 1),
        wrongClick: false,
        showMe: false,
      };
    }
    case "next": {
      if (state.status !== "active" || !state.guideId) return state;
      return reduceGuideState(state, { type: "complete-step" }, guides);
    }
    case "exit":
      return { ...INITIAL_GUIDE_STATE, status: "exited" };
    case "wrong-click":
      if (state.status !== "active") return state;
      return { ...state, wrongClick: true };
    case "clear-wrong-click":
      return { ...state, wrongClick: false };
    case "show-me":
      if (state.status !== "active") return state;
      return { ...state, showMe: true, wrongClick: false };
    case "hide-show-me":
      return { ...state, showMe: false };
    default:
      return state;
  }
}

export function selectActiveGuide(
  state: GuideState,
  guides: readonly GuideDefinition[],
): GuideDefinition | null {
  if (state.status !== "active" && state.status !== "completed") return null;
  return findGuide(guides, state.guideId);
}

export function selectActiveStep(state: GuideState, guides: readonly GuideDefinition[]) {
  const guide = selectActiveGuide(state, guides);
  if (!guide) return null;
  return guide.steps[state.stepIndex] ?? null;
}
