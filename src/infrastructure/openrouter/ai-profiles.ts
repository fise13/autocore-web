export type AiProfileId =
  | "scanOcr"
  | "scanDisambiguate"
  | "importGrid"
  | "importVision"
  | "engineIntakeVision"
  | "documentPolish"
  | "assistant"
  | "default";

export type AiProfile = {
  /** OpenRouter X-Title */
  title: string;
  /** Env vars checked in order for model override. */
  modelEnv: string[];
  /** Primary completion budget. */
  maxTokens: number;
  /** Second attempt after JSON/schema failure. */
  retryMaxTokens: number;
  temperature: number;
  /** Fetch abort timeout. */
  timeoutMs: number;
};

/**
 * Tuned budgets: enough for real payloads, low enough for free/low-credit OpenRouter.
 * Override per call via options.maxTokens / options.model.
 */
export const AI_PROFILES: Record<AiProfileId, AiProfile> = {
  scanOcr: {
    title: "AutoCore Scan",
    modelEnv: ["SCAN_AI_MODEL", "OPENROUTER_MODEL"],
    maxTokens: 1024,
    retryMaxTokens: 2048,
    temperature: 0,
    timeoutMs: 45_000,
  },
  scanDisambiguate: {
    title: "AutoCore Scan",
    modelEnv: ["SCAN_AI_MODEL", "OPENROUTER_MODEL"],
    maxTokens: 512,
    retryMaxTokens: 1024,
    temperature: 0,
    timeoutMs: 25_000,
  },
  /**
   * Spreadsheet → grid mapping (motors and warehouse). Batches of rows come back as one
   * JSON object, so the budget is much larger than the vision profiles and the timeout
   * allows for a slow first token on a long prompt.
   */
  importGrid: {
    title: "AutoCore Import",
    modelEnv: ["IMPORT_AI_MODEL", "OPENROUTER_MODEL"],
    maxTokens: 6144,
    retryMaxTokens: 8192,
    temperature: 0,
    timeoutMs: 120_000,
  },
  importVision: {
    title: "AutoCore Import",
    modelEnv: ["IMPORT_AI_MODEL", "DOCUMENT_AI_MODEL", "OPENROUTER_MODEL"],
    maxTokens: 2048,
    retryMaxTokens: 4096,
    temperature: 0,
    timeoutMs: 90_000,
  },
  engineIntakeVision: {
    title: "AutoCore Engine Intake",
    modelEnv: ["ENGINE_INTAKE_AI_MODEL", "SCAN_AI_MODEL", "OPENROUTER_MODEL"],
    maxTokens: 1536,
    retryMaxTokens: 2048,
    temperature: 0,
    timeoutMs: 45_000,
  },
  documentPolish: {
    title: "AutoCore Documents",
    modelEnv: ["DOCUMENT_AI_MODEL", "OPENROUTER_MODEL"],
    maxTokens: 1024,
    retryMaxTokens: 2048,
    temperature: 0.1,
    timeoutMs: 30_000,
  },
  assistant: {
    title: "AutoCore Core",
    // NVIDIA_AI_MODEL is deliberately NOT listed: it belongs to the separate nvidia lane
    // (its own API key). Listing it here let a local probe variable pull the default lane
    // off Gemini for every JSON call.
    modelEnv: ["ASSISTANT_AI_MODEL", "OPENROUTER_MODEL", "DOCUMENT_AI_MODEL"],
    // Headroom for `thinking` + structured blocks in one JSON reply.
    maxTokens: 2200,
    retryMaxTokens: 3200,
    temperature: 0.2,
    timeoutMs: 60_000,
  },
  default: {
    title: "AutoCore",
    modelEnv: ["DOCUMENT_AI_MODEL", "SCAN_AI_MODEL", "OPENROUTER_MODEL"],
    maxTokens: 512,
    retryMaxTokens: 1024,
    temperature: 0.1,
    timeoutMs: 45_000,
  },
};

/** Nothing may ask for more than this, whatever the profile or the env says. */
export const ABSOLUTE_MAX_TOKENS = 8192;

/** Below this, no model can answer anything structured. */
const MIN_MAX_TOKENS = 64;

function clamp(value: number): number {
  return Math.min(Math.max(Math.floor(value), MIN_MAX_TOKENS), ABSOLUTE_MAX_TOKENS);
}

const warned = new Set<string>();

/**
 * The completion budget for one call.
 *
 * `OPENROUTER_MAX_TOKENS` is a global cost knob, and it used to be able to cut
 * any profile down to its own value. Set to 512 in a real environment, it
 * silently truncated every structured call in the product: the reply came back
 * cut in half, the shared parser closed its dangling braces, and a chunk of
 * sixty rows arrived downstream as an answer about one row that looked
 * perfectly valid. Nothing logged, nothing failed.
 *
 * So the knob may raise a budget and may not lower it past what the profile
 * declares it needs. A profile's number is a requirement — it was measured
 * against the payload the profile actually sends. An operator who wants
 * cheaper calls picks a cheaper model rather than one that cannot finish a
 * sentence.
 */
export function resolveProfileMaxTokens(
  profile: AiProfile,
  explicit?: number,
  which: "maxTokens" | "retryMaxTokens" = "maxTokens",
): number {
  if (typeof explicit === "number" && Number.isFinite(explicit) && explicit > 0) {
    return clamp(explicit);
  }

  const required = profile[which];
  const fromEnv = Number(process.env.OPENROUTER_MAX_TOKENS?.trim());
  if (!Number.isFinite(fromEnv) || fromEnv <= 0) return clamp(required);

  if (fromEnv < required) {
    const key = `${profile.title}:${which}:${fromEnv}`;
    if (!warned.has(key)) {
      warned.add(key);
      console.warn(
        `[ai] OPENROUTER_MAX_TOKENS=${fromEnv} is below what "${profile.title}" needs (${required}); using ${required} so the reply is not cut off`,
      );
    }
    return clamp(required);
  }

  return clamp(fromEnv);
}

export function resolveProfileModel(profile: AiProfile, explicit?: string): string | undefined {
  if (explicit?.trim()) return explicit.trim();
  for (const key of profile.modelEnv) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return undefined;
}

/**
 * What a call throws when the model ran out of completion budget mid-answer.
 * Shared so the retry can recognise it — a truncated reply is the one failure
 * that a second attempt with a bigger budget genuinely fixes.
 */
export const TRUNCATED_RESPONSE_MESSAGE =
  "The AI response was cut off by max_tokens";

export function isRecoverableAiParseError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes(TRUNCATED_RESPONSE_MESSAGE)) return true;
  return /некорректный JSON|не подходит|Пустой ответ AI|invalid JSON/i.test(message);
}
