import "server-only";

const DEFAULT_MODEL = "google/gemini-2.0-flash-001";
/** Keep low — OpenRouter free/low-credit accounts reject large default max_tokens. */
const DEFAULT_MAX_TOKENS = 512;

export type OpenRouterMessage =
  | { role: "system" | "user" | "assistant"; content: string }
  | {
      role: "user";
      content: Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }>;
    };

export type OpenRouterChatOptions = {
  /** Product label for OpenRouter rankings (X-Title). */
  title?: string;
  /** Explicit model; otherwise DOCUMENT_AI_MODEL → SCAN_AI_MODEL → default. */
  model?: string;
  temperature?: number;
  /** Cap completion tokens (OpenRouter bills against this ceiling). */
  maxTokens?: number;
};

export function readOpenRouterApiKey(): string | null {
  const key =
    process.env.OPENROUTER_API_KEY?.trim() ||
    process.env.OPEN_ROUTER_API_KEY?.trim() ||
    null;
  return key || null;
}

export function resolveOpenRouterModel(explicit?: string): string {
  return (
    explicit?.trim() ||
    process.env.DOCUMENT_AI_MODEL?.trim() ||
    process.env.SCAN_AI_MODEL?.trim() ||
    process.env.OPENROUTER_MODEL?.trim() ||
    DEFAULT_MODEL
  );
}

function resolveMaxTokens(explicit?: number): number {
  if (typeof explicit === "number" && Number.isFinite(explicit) && explicit > 0) {
    return Math.min(Math.floor(explicit), 8192);
  }
  const fromEnv = Number(process.env.OPENROUTER_MAX_TOKENS?.trim());
  if (Number.isFinite(fromEnv) && fromEnv > 0) {
    return Math.min(Math.floor(fromEnv), 8192);
  }
  return DEFAULT_MAX_TOKENS;
}

function mapOpenRouterError(status: number, text: string): Error {
  try {
    const parsed = JSON.parse(text) as {
      error?: { message?: string; code?: number };
    };
    const message = parsed.error?.message?.trim();
    if (message) {
      if (status === 402 || /credits|max_tokens|afford/i.test(message)) {
        return new Error(
          `Не хватает кредитов OpenRouter (лимит ответа ${resolveMaxTokens()} tok). Пополни баланс ≈$5: https://openrouter.ai/settings/credits`,
        );
      }
      return new Error(message);
    }
  } catch {
    // fall through
  }
  return new Error(text || `OpenRouter error ${status}`);
}

export async function callOpenRouterJson<T>(
  messages: OpenRouterMessage[],
  schema: { parse: (value: unknown) => T },
  options?: OpenRouterChatOptions,
): Promise<T> {
  const apiKey = readOpenRouterApiKey();
  if (!apiKey) {
    throw new Error("OpenRouter не настроен. Задайте OPENROUTER_API_KEY.");
  }

  const maxTokens = resolveMaxTokens(options?.maxTokens);

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "https://app.myautocore.com",
      "X-Title": options?.title?.trim() || "AutoCore",
    },
    body: JSON.stringify({
      model: resolveOpenRouterModel(options?.model),
      temperature: options?.temperature ?? 0.1,
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
      messages,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw mapOpenRouterError(response.status, text);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("Пустой ответ AI");

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("AI вернул некорректный JSON");
  }

  return schema.parse(parsed);
}
