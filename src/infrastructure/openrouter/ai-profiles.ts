export type AiProfileId =
  | "scanOcr"
  | "scanDisambiguate"
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
    // NVIDIA_AI_MODEL — local-only probe for free Nvidia OpenRouter models.
    modelEnv: ["NVIDIA_AI_MODEL", "ASSISTANT_AI_MODEL", "OPENROUTER_MODEL", "DOCUMENT_AI_MODEL"],
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

export function resolveProfileModel(profile: AiProfile, explicit?: string): string | undefined {
  if (explicit?.trim()) return explicit.trim();
  for (const key of profile.modelEnv) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return undefined;
}

export function isRecoverableAiParseError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /некорректный JSON|не подходит|Пустой ответ AI/i.test(message);
}
