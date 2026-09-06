import { hasRecentGuideSignal } from "@/lib/guides/signals";
import { findGuideTarget, isElementVisible } from "@/lib/guides/targets";
import type { GuideCompletionCondition, GuideStep } from "@/lib/guides/types";

export type GuideConditionContext = {
  pathname: string;
  searchParams: URLSearchParams;
  startedAt: number;
  root?: ParentNode;
};

export function evaluateCondition(
  condition: GuideCompletionCondition,
  ctx: GuideConditionContext,
): boolean {
  const root = ctx.root ?? (typeof document === "undefined" ? undefined : document);
  switch (condition.kind) {
    case "pathname":
      return (
        ctx.pathname === condition.prefix || ctx.pathname.startsWith(`${condition.prefix}/`)
      );
    case "search-param": {
      const value = ctx.searchParams.get(condition.key);
      if (condition.value == null) return value != null;
      return value === condition.value;
    }
    case "element": {
      if (!root) return false;
      const el = findGuideTarget(condition.target, root);
      return Boolean(el && isElementVisible(el));
    }
    case "complete": {
      if (!root) return false;
      const el = findGuideTarget(condition.target, root);
      return el?.getAttribute("data-guide-complete") === "true";
    }
    case "signal":
      return hasRecentGuideSignal(condition.name, ctx.startedAt);
    default:
      return false;
  }
}

export function isStepComplete(step: GuideStep, ctx: GuideConditionContext): boolean {
  if (step.completion.length === 0) return false;
  return step.completion.every((condition) => evaluateCondition(condition, ctx));
}
