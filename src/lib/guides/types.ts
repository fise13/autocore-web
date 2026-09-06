/**
 * Reusable interactive-guide contract.
 *
 * AI understands intent and returns a `guideId`. This engine owns highlighting,
 * progress, and advancement. The product UI owns real state and actions.
 * Catalog: `src/lib/guides/catalog.ts`.
 */

export type GuideId = string;

export type GuideCompletionCondition =
  | { kind: "pathname"; prefix: string }
  | { kind: "search-param"; key: string; value?: string }
  | { kind: "element"; target: string }
  | { kind: "complete"; target: string }
  | { kind: "signal"; name: string };

export type GuideStep = {
  id: string;
  title: string;
  instruction: string;
  /** Primary `data-guide` id. */
  target: string;
  /**
   * Used when the primary target is in the DOM but not visible yet
   * (e.g. a Motors tab panel that is still closed).
   */
  fallbackTarget?: string;
  completion: GuideCompletionCondition[];
  /** Optional extra copy shown in the spotlight tooltip. */
  hint?: string;
  /** Shown when the user clicks something that is not the target. */
  wrongClick?: string;
};

export type GuideDefinition = {
  id: GuideId;
  title: string;
  summary: string;
  /** Short line the AI can speak before offering the walkthrough. */
  aiExplanation: string;
  steps: GuideStep[];
};

export type GuideStatus = "idle" | "active" | "completed" | "exited";

export type GuideState = {
  status: GuideStatus;
  guideId: GuideId | null;
  stepIndex: number;
  wrongClick: boolean;
  showMe: boolean;
};

export type GuideEvent =
  | { type: "start"; guideId: GuideId }
  | { type: "complete-step" }
  | { type: "back" }
  | { type: "next" }
  | { type: "exit" }
  | { type: "wrong-click" }
  | { type: "clear-wrong-click" }
  | { type: "show-me" }
  | { type: "hide-show-me" };

export const INITIAL_GUIDE_STATE: GuideState = {
  status: "idle",
  guideId: null,
  stepIndex: 0,
  wrongClick: false,
  showMe: false,
};
