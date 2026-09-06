import { AI_GUIDE_SESSION_KEY } from "@/lib/playground/ai-guide/config";

export function markAiGuideSessionActive(): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(AI_GUIDE_SESSION_KEY, "1");
}

export function clearAiGuideSessionMarker(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(AI_GUIDE_SESSION_KEY);
}

export function isAiGuideSessionMarked(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(AI_GUIDE_SESSION_KEY) === "1";
}
