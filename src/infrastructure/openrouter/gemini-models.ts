/**
 * One place that says which model AutoCore talks to.
 *
 * Every AI surface — scan, import, engine intake, documents, Core — runs on Gemini through
 * OpenRouter. Model ids used to be spelled out per module and per env var, which is how the
 * app ended up with three different defaults; anything that needs a different model now
 * overrides it explicitly through its profile env var.
 */

/** Default for everything: fast, cheap, long-context, good at structured JSON. */
export const DEFAULT_GEMINI_MODEL = "google/gemini-2.5-flash";

/** For work that needs more reasoning than a flash model gives (opt in via env). */
export const GEMINI_PRO_MODEL = "google/gemini-2.5-pro";

/** True when a model id targets Gemini — used to keep the config honest in diagnostics. */
export function isGeminiModel(modelId: string): boolean {
  return modelId.trim().toLowerCase().startsWith("google/gemini");
}
