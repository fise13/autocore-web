import "server-only";

import {
  ABSOLUTE_MAX_TOKENS,
  AI_PROFILES,
  isRecoverableAiParseError,
  resolveProfileMaxTokens,
  resolveProfileModel,
  TRUNCATED_RESPONSE_MESSAGE,
  type AiProfileId,
} from "@/infrastructure/openrouter/ai-profiles";
import { DEFAULT_GEMINI_MODEL } from "@/infrastructure/openrouter/gemini-models";
import { headerSafeTitle } from "@/infrastructure/openrouter/header-safe-title";
import { parseAiJsonContent } from "@/infrastructure/openrouter/parse-ai-json";
import { resolveProxyAuthHeaders } from "@/infrastructure/openrouter/proxy-auth.server";
import type { AiTransport } from "@/infrastructure/openrouter/transport";

export type { AiTransport };

const DEFAULT_MODEL = DEFAULT_GEMINI_MODEL;
const AI_PROXY_REGION = "europe-west1";
const AI_PROXY_FUNCTION = "openrouterProxy";

export type OpenRouterMessage =
  | { role: "system" | "user" | "assistant"; content: string }
  | {
      role: "user";
      content: Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }>;
    };

export type OpenRouterChatOptions = {
  /** Named budget/model/timeout profile. */
  profile?: AiProfileId;
  /**
   * `nvidia` — Core local probe: uses NVIDIA_OPENROUTER_API_KEY + NVIDIA_AI_MODEL
   * only, never the Gemini OpenRouter key/model.
   */
  lane?: "default" | "nvidia";
  /** Product label for OpenRouter rankings (X-Title). */
  title?: string;
  /** Explicit model; otherwise profile env → OPENROUTER_MODEL → default. */
  model?: string;
  temperature?: number;
  /** Cap completion tokens (OpenRouter bills against this ceiling). */
  maxTokens?: number;
  /** Override retry budget after JSON/schema failure. */
  retryMaxTokens?: number;
  /** Fetch timeout (ms). */
  timeoutMs?: number;
  /** Extra attempts after recoverable JSON/schema errors (default 1). */
  retries?: number;
  /** Ask OpenRouter for reasoning tokens (when the model supports them). */
  includeReasoning?: boolean;
};

export type OpenRouterJsonResult<T> = {
  data: T;
  /** Native thinking text from the model, if returned. */
  reasoning: string | null;
};

/**
 * The "nvidia" lane is about which OpenRouter *key* pays, not which model runs. It defaults
 * to Gemini like every other lane; set NVIDIA_AI_MODEL to probe a different model locally.
 */
const DEFAULT_NVIDIA_LANE_MODEL = DEFAULT_GEMINI_MODEL;

export function readOpenRouterApiKey(): string | null {
  const key =
    process.env.OPENROUTER_API_KEY?.trim() ||
    process.env.OPEN_ROUTER_API_KEY?.trim() ||
    null;
  return key || null;
}

/** Separate OpenRouter key for Core NVIDIA local testing — keeps Gemini credits untouched. */
export function readNvidiaOpenRouterApiKey(): string | null {
  return process.env.NVIDIA_OPENROUTER_API_KEY?.trim() || null;
}

export function resolveNvidiaAiModel(explicit?: string): string {
  return (
    explicit?.trim() ||
    process.env.NVIDIA_AI_MODEL?.trim() ||
    DEFAULT_NVIDIA_LANE_MODEL
  );
}

function firebaseProjectId(): string | null {
  const id =
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() ||
    process.env.GCLOUD_PROJECT?.trim() ||
    process.env.FIREBASE_PROJECT_ID?.trim() ||
    null;
  return id || null;
}

/** Default Cloud Function URL for the AI proxy — no Vercel-specific AI env needed. */
export function resolveAiProxyUrl(): string | null {
  const explicit = process.env.AI_PROXY_URL?.trim();
  if (explicit) return explicit;
  const projectId = firebaseProjectId();
  if (!projectId) return null;
  return `https://${AI_PROXY_REGION}-${projectId}.cloudfunctions.net/${AI_PROXY_FUNCTION}`;
}

function canUseFirebaseServiceAccount(): boolean {
  return Boolean(
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim() ||
      process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim(),
  );
}

export function readAiTransport(): AiTransport | null {
  // Prefer direct whenever a key is present — production must not set this var.
  const apiKey = readOpenRouterApiKey();
  if (apiKey) {
    return { kind: "direct", apiKey };
  }

  const url = resolveAiProxyUrl();
  const secret = process.env.AI_PROXY_SECRET?.trim() || null;
  if (url && (secret || canUseFirebaseServiceAccount())) {
    return { kind: "proxy", url, secret };
  }

  return null;
}

/** Core-only local lane — never shares OPENROUTER_API_KEY with Gemini traffic. */
export function readNvidiaAiTransport(): AiTransport | null {
  const apiKey = readNvidiaOpenRouterApiKey();
  return apiKey ? { kind: "direct", apiKey } : null;
}

export function resolveOpenRouterModel(explicit?: string, profileId: AiProfileId = "default"): string {
  const profile = AI_PROFILES[profileId];
  return (
    resolveProfileModel(profile, explicit) ||
    process.env.OPENROUTER_MODEL?.trim() ||
    DEFAULT_MODEL
  );
}

function mapOpenRouterError(status: number, text: string, maxTokens: number): Error {
  try {
    const parsed = JSON.parse(text) as {
      error?: { message?: string; code?: number } | string;
    };
    // The Firebase proxy answers `{"error": "..."}` while OpenRouter answers
    // `{"error": {"message": "..."}}`. The proxy's message is the one that
    // names a misconfiguration a person can actually fix, so it must not be
    // the one that gets thrown away.
    const message =
      typeof parsed.error === "string" ? parsed.error.trim() : parsed.error?.message?.trim();
    if (message) {
      if (status === 402 || /credits|max_tokens|afford/i.test(message)) {
        return new Error(
          `Не хватает кредитов OpenRouter (лимит ответа ${maxTokens} tok). Пополни баланс ≈$5: https://openrouter.ai/settings/credits`,
        );
      }
      if (status === 429 || /rate.?limit/i.test(message)) {
        return new Error("OpenRouter: too many requests. Wait a moment and try again.");
      }
      return new Error(message);
    }
  } catch {
    // fall through
  }
  return new Error(text || `OpenRouter error ${status}`);
}

function extractNativeReasoning(message: {
  reasoning?: string | null;
  reasoning_content?: string | null;
  reasoning_details?: Array<{ type?: string; text?: string | null; summary?: string | string[] | null }>;
} | undefined): string | null {
  if (!message) return null;

  const direct = message.reasoning?.trim() || message.reasoning_content?.trim();
  if (direct) return direct;

  const details = message.reasoning_details;
  if (!Array.isArray(details) || details.length === 0) return null;

  const parts: string[] = [];
  for (const detail of details) {
    if (typeof detail.text === "string" && detail.text.trim()) {
      parts.push(detail.text.trim());
      continue;
    }
    if (typeof detail.summary === "string" && detail.summary.trim()) {
      parts.push(detail.summary.trim());
      continue;
    }
    if (Array.isArray(detail.summary)) {
      for (const line of detail.summary) {
        if (typeof line === "string" && line.trim()) parts.push(line.trim());
      }
    }
  }
  return parts.length ? parts.join("\n") : null;
}

/** Models often wrap chain-of-thought in tags before the JSON payload. */
function extractTaggedReasoning(content: string): { reasoning: string | null; content: string } {
  const match = content.match(
    /<(?:think|thinking|reasoning)>\s*([\s\S]*?)\s*<\/(?:think|thinking|reasoning)>/i,
  );
  if (!match?.[1]?.trim()) {
    return { reasoning: null, content };
  }
  return {
    reasoning: match[1].trim(),
    content: content.replace(match[0], "").trim(),
  };
}

async function callOpenRouterOnce<T>(
  messages: OpenRouterMessage[],
  schema: { parse: (value: unknown) => T },
  params: {
    transport: AiTransport;
    model: string;
    title: string;
    temperature: number;
    maxTokens: number;
    timeoutMs: number;
    includeReasoning: boolean;
  },
): Promise<OpenRouterJsonResult<T>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), params.timeoutMs);

  // The proxy forwards the body untouched and attaches the real key, so the
  // request shape is identical on both paths.
  const { transport } = params;
  const endpoint =
    transport.kind === "proxy" ? transport.url : "https://openrouter.ai/api/v1/chat/completions";
  const authHeaders: Record<string, string> =
    transport.kind === "proxy"
      ? await resolveProxyAuthHeaders(transport, params.title)
      : {
          Authorization: `Bearer ${transport.apiKey}`,
          "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "https://app.myautocore.com",
          "X-Title": headerSafeTitle(params.title),
        };

  const body: Record<string, unknown> = {
    model: params.model,
    temperature: params.temperature,
    max_tokens: params.maxTokens,
    response_format: { type: "json_object" },
    messages,
  };
  // Gemini 2.5 thinks by default and its thinking tokens are billed against max_tokens.
  // Left implicit, a 6k budget was spent entirely on reasoning and the JSON came back after
  // two characters — every structured call silently failed as "некорректный JSON". Say
  // explicitly which mode this call wants.
  body.reasoning = params.includeReasoning
    ? { enabled: true, effort: "medium", exclude: false }
    : { enabled: false };

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      signal: controller.signal,
      headers: {
        ...authHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`OpenRouter: таймаут ${Math.round(params.timeoutMs / 1000)}с`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw mapOpenRouterError(response.status, text, params.maxTokens);
  }

  const payload = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string;
        reasoning?: string | null;
        reasoning_content?: string | null;
        reasoning_details?: Array<{
          type?: string;
          text?: string | null;
          summary?: string | string[] | null;
        }>;
      };
      finish_reason?: string;
    }>;
  };
  const choice = payload.choices?.[0];
  const rawContent = choice?.message?.content;
  if (!rawContent) throw new Error("The AI returned an empty response");

  const tagged = extractTaggedReasoning(rawContent);
  const content = tagged.content || rawContent;

  // A reply the model was cut off mid-sentence is incomplete, and the shared
  // parser is good enough at closing dangling braces to make it look whole —
  // an answer about sixty rows arrives as an answer about one. Refuse it here
  // and let the retry ask again with the larger budget.
  if (choice?.finish_reason === "length") {
    throw new Error(TRUNCATED_RESPONSE_MESSAGE);
  }

  let parsed: unknown;
  try {
    parsed = parseAiJsonContent(content);
  } catch {
    throw new Error("The AI returned invalid JSON");
  }

  try {
    return {
      data: schema.parse(parsed),
      reasoning:
        extractNativeReasoning(choice?.message) ||
        tagged.reasoning ||
        null,
    };
  } catch (error) {
    const detail =
      error instanceof Error && error.message.trim()
        ? error.message.trim().slice(0, 180)
        : "схема ответа не совпала";
    throw new Error(`AI вернул JSON, но он не подходит: ${detail}`);
  }
}

const AI_NOT_CONFIGURED =
  "AI не настроен. Для local: добавьте OPENROUTER_API_KEY в .env.local. В production ключ живёт в Firebase Functions (openrouterProxy).";

const NVIDIA_AI_NOT_CONFIGURED =
  "Core NVIDIA lane не настроен. Добавьте NVIDIA_OPENROUTER_API_KEY в .env.local (отдельный OpenRouter ключ — не OPENROUTER_API_KEY с Gemini).";

/**
 * JSON chat completion with profile budgets, timeout, and auto-retry on parse failures.
 * Returns parsed data plus optional native reasoning text.
 */
export async function callOpenRouterJsonDetailed<T>(
  messages: OpenRouterMessage[],
  schema: { parse: (value: unknown) => T },
  options?: OpenRouterChatOptions,
): Promise<OpenRouterJsonResult<T>> {
  const lane = options?.lane ?? "default";
  const transport = lane === "nvidia" ? readNvidiaAiTransport() : readAiTransport();
  if (!transport) {
    throw new Error(lane === "nvidia" ? NVIDIA_AI_NOT_CONFIGURED : AI_NOT_CONFIGURED);
  }

  const profileId = options?.profile ?? "default";
  const profile = AI_PROFILES[profileId];
  const model =
    lane === "nvidia"
      ? resolveNvidiaAiModel(options?.model)
      : resolveOpenRouterModel(options?.model, profileId);
  // Sanitized once, here, so a label with an em dash in it cannot throw before
  // the request is made. See `headerSafeTitle`.
  const title = headerSafeTitle(options?.title?.trim() || profile.title);
  const temperature = options?.temperature ?? profile.temperature;
  const timeoutMs = options?.timeoutMs ?? profile.timeoutMs;
  const retries = Math.max(0, options?.retries ?? 1);
  const includeReasoning = Boolean(options?.includeReasoning ?? lane === "nvidia");

  let maxTokens = resolveProfileMaxTokens(profile, options?.maxTokens);
  const retryMaxTokens = resolveProfileMaxTokens(
    profile,
    options?.retryMaxTokens,
    "retryMaxTokens",
  );

  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await callOpenRouterOnce(messages, schema, {
        transport,
        model,
        title,
        temperature,
        maxTokens,
        timeoutMs,
        includeReasoning,
      });
    } catch (error) {
      lastError = error;
      const canRetry = attempt < retries && isRecoverableAiParseError(error);
      if (!canRetry) throw error;
      maxTokens = Math.max(maxTokens, retryMaxTokens);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("OpenRouter request failed");
}

/** Same as {@link callOpenRouterJsonDetailed} but returns only the parsed payload. */
export async function callOpenRouterJson<T>(
  messages: OpenRouterMessage[],
  schema: { parse: (value: unknown) => T },
  options?: OpenRouterChatOptions,
): Promise<T> {
  const result = await callOpenRouterJsonDetailed(messages, schema, options);
  return result.data;
}
