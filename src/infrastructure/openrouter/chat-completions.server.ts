import "server-only";

import {
  AI_PROFILES,
  isRecoverableAiParseError,
  resolveProfileModel,
  type AiProfileId,
} from "@/infrastructure/openrouter/ai-profiles";
import { parseAiJsonContent } from "@/infrastructure/openrouter/parse-ai-json";

const DEFAULT_MODEL = "google/gemini-2.5-flash";
const ABSOLUTE_MAX_TOKENS = 8192;
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
};

export function readOpenRouterApiKey(): string | null {
  const key =
    process.env.OPENROUTER_API_KEY?.trim() ||
    process.env.OPEN_ROUTER_API_KEY?.trim() ||
    null;
  return key || null;
}

/**
 * How this runtime reaches OpenRouter.
 *
 * Production path: Firebase `openrouterProxy` only. The OpenRouter key never
 * leaves Functions env. Auth is either optional `AI_PROXY_SECRET` or a Google
 * ID token from the Firebase Admin service account (already on Vercel/local).
 * Direct `OPENROUTER_API_KEY` is a local fallback when the proxy URL cannot be
 * resolved.
 */
export type AiTransport =
  | { kind: "direct"; apiKey: string }
  | { kind: "proxy"; url: string; secret: string | null };

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
  const url = resolveAiProxyUrl();
  const secret = process.env.AI_PROXY_SECRET?.trim() || null;
  if (url && (secret || canUseFirebaseServiceAccount())) {
    return { kind: "proxy", url, secret };
  }

  const apiKey = readOpenRouterApiKey();
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

function clampMaxTokens(value: number): number {
  return Math.min(Math.max(Math.floor(value), 64), ABSOLUTE_MAX_TOKENS);
}

function resolveMaxTokens(explicit: number | undefined, profileDefault: number): number {
  if (typeof explicit === "number" && Number.isFinite(explicit) && explicit > 0) {
    return clampMaxTokens(explicit);
  }
  const fromEnv = Number(process.env.OPENROUTER_MAX_TOKENS?.trim());
  if (Number.isFinite(fromEnv) && fromEnv > 0) {
    return clampMaxTokens(fromEnv);
  }
  return clampMaxTokens(profileDefault);
}

function mapOpenRouterError(status: number, text: string, maxTokens: number): Error {
  try {
    const parsed = JSON.parse(text) as {
      error?: { message?: string; code?: number };
    };
    const message = parsed.error?.message?.trim();
    if (message) {
      if (status === 402 || /credits|max_tokens|afford/i.test(message)) {
        return new Error(
          `Не хватает кредитов OpenRouter (лимит ответа ${maxTokens} tok). Пополни баланс ≈$5: https://openrouter.ai/settings/credits`,
        );
      }
      if (status === 429 || /rate.?limit/i.test(message)) {
        return new Error("OpenRouter: слишком много запросов. Подождите и повторите.");
      }
      return new Error(message);
    }
  } catch {
    // fall through
  }
  return new Error(text || `OpenRouter error ${status}`);
}

async function resolveProxyAuthHeaders(
  transport: Extract<AiTransport, { kind: "proxy" }>,
  title: string,
): Promise<Record<string, string>> {
  const headers: Record<string, string> = { "x-ai-title": title };
  if (transport.secret) {
    headers["x-ai-proxy-key"] = transport.secret;
    return headers;
  }

  const { GoogleAuth } = await import("google-auth-library");
  const { parseServiceAccount } = await import("@/infrastructure/firebase/resolve-service-account");
  const credentials = parseServiceAccount() as {
    client_email: string;
    private_key: string;
  };
  const auth = new GoogleAuth({ credentials });
  const client = await auth.getIdTokenClient(transport.url);
  const requestHeaders = await client.getRequestHeaders(transport.url);
  const authorization =
    requestHeaders.get("Authorization") || requestHeaders.get("authorization");
  if (!authorization) {
    throw new Error("Не удалось получить Google ID token для Firebase AI proxy");
  }
  headers.Authorization = authorization;
  return headers;
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
  },
): Promise<T> {
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
          "X-Title": params.title,
        };

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      signal: controller.signal,
      headers: {
        ...authHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: params.model,
        temperature: params.temperature,
        max_tokens: params.maxTokens,
        response_format: { type: "json_object" },
        messages,
      }),
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
    choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
  };
  const choice = payload.choices?.[0];
  const content = choice?.message?.content;
  if (!content) throw new Error("Пустой ответ AI");

  let parsed: unknown;
  try {
    parsed = parseAiJsonContent(content);
  } catch {
    if (choice?.finish_reason === "length") {
      throw new Error("AI вернул некорректный JSON (ответ обрезан по max_tokens)");
    }
    throw new Error("AI вернул некорректный JSON");
  }

  try {
    return schema.parse(parsed);
  } catch (error) {
    const detail =
      error instanceof Error && error.message.trim()
        ? error.message.trim().slice(0, 180)
        : "схема ответа не совпала";
    throw new Error(`AI вернул JSON, но он не подходит: ${detail}`);
  }
}

const AI_NOT_CONFIGURED =
  "AI не настроен. OpenRouter ключ задаётся только в Firebase Functions (OPENROUTER_API_KEY). Убедитесь, что openrouterProxy задеплоен и на сервере есть Firebase Admin credentials.";

/**
 * JSON chat completion with profile budgets, timeout, and auto-retry on parse failures.
 */
export async function callOpenRouterJson<T>(
  messages: OpenRouterMessage[],
  schema: { parse: (value: unknown) => T },
  options?: OpenRouterChatOptions,
): Promise<T> {
  const transport = readAiTransport();
  if (!transport) {
    throw new Error(AI_NOT_CONFIGURED);
  }

  const profileId = options?.profile ?? "default";
  const profile = AI_PROFILES[profileId];
  const model = resolveOpenRouterModel(options?.model, profileId);
  const title = options?.title?.trim() || profile.title;
  const temperature = options?.temperature ?? profile.temperature;
  const timeoutMs = options?.timeoutMs ?? profile.timeoutMs;
  const retries = Math.max(0, options?.retries ?? 1);

  let maxTokens = resolveMaxTokens(options?.maxTokens, profile.maxTokens);
  const retryMaxTokens = resolveMaxTokens(
    options?.retryMaxTokens,
    profile.retryMaxTokens,
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
