const STORAGE_KEY = "autocore.core.seedPrompt";

export function stashCoreSeedPrompt(prompt: string): void {
  if (typeof window === "undefined") return;
  const trimmed = prompt.trim();
  if (!trimmed) return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, trimmed);
  } catch {
    // Quota — the user can still type the question.
  }
}

export function takeCoreSeedPrompt(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.sessionStorage.getItem(STORAGE_KEY);
    if (!value) return null;
    window.sessionStorage.removeItem(STORAGE_KEY);
    return value.trim() || null;
  } catch {
    return null;
  }
}
