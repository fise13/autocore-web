export const GUIDE_ATTR = "data-guide";
export const GUIDE_COMPLETE_ATTR = "data-guide-complete";

export function guideSelector(id: string): string {
  return `[${GUIDE_ATTR}="${cssEscape(id)}"]`;
}

export function findGuideTargets(id: string, root: ParentNode = document): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(guideSelector(id)));
}

export function findGuideTarget(id: string, root: ParentNode = document): HTMLElement | null {
  const matches = findGuideTargets(id, root);
  return matches.find((element) => isElementVisible(element)) ?? matches[0] ?? null;
}

export function isElementVisible(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  if (rect.width < 2 || rect.height < 2) return false;
  const style = window.getComputedStyle(element);
  if (style.visibility === "hidden" || style.display === "none" || style.opacity === "0") {
    return false;
  }
  return true;
}

export function resolveGuideTarget(
  target: string,
  fallbackTarget: string | undefined,
  root: ParentNode = document,
): HTMLElement | null {
  const primary = findGuideTarget(target, root);
  if (primary && isElementVisible(primary)) return primary;
  if (fallbackTarget) {
    const fallback = findGuideTarget(fallbackTarget, root);
    if (fallback && isElementVisible(fallback)) return fallback;
  }
  return primary && isElementVisible(primary) ? primary : fallbackTarget
    ? findGuideTarget(fallbackTarget, root)
    : primary;
}

function cssEscape(value: string): string {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(value);
  }
  return value.replace(/["\\]/g, "\\$&");
}
