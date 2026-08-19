import "server-only";

import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import {
  extractReasoningMiddleware,
  simulateStreamingMiddleware,
  wrapLanguageModel,
  type LanguageModel,
} from "ai";

import {
  readAiTransport,
  readNvidiaAiTransport,
} from "@/infrastructure/openrouter/chat-completions.server";
import { DEFAULT_GEMINI_MODEL } from "@/infrastructure/openrouter/gemini-models";
import { resolveProxyAuthHeaders } from "@/infrastructure/openrouter/proxy-auth.server";
import type { AiTransport } from "@/infrastructure/openrouter/transport";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const CORE_TITLE = "AutoCore Core";

/**
 * Default for the multi-step tool agent. Free-tier NVIDIA models are too
 * capacity-constrained for `stopWhen: stepCountIs(N)` loops — override with
 * `CORE_AI_MODEL` only when you explicitly want a different model (including
 * `nvidia/...:free` for cheap single-step experiments).
 */
const DEFAULT_CORE_MODEL = DEFAULT_GEMINI_MODEL;

export const CORE_AI_NOT_CONFIGURED =
  "Core is not configured. Add NVIDIA_OPENROUTER_API_KEY (or OPENROUTER_API_KEY) to .env.local, " +
  "or configure the Firebase AI proxy.";

export type CoreLane = {
  transport: AiTransport;
  modelId: string;
  /**
   * `false` only on the legacy gen-1 Firebase proxy, which buffers the whole
   * upstream body before responding (`functions.region(...).https.onRequest`
   * with `response.send(text)`). Set `CORE_STREAM_PROXY_URL` once the gen-2
   * `openrouterStreamProxy` is deployed to get real token streaming in prod.
   */
  canStream: boolean;
  baseURL: string;
};

function trimmedEnv(name: string): string | null {
  return process.env[name]?.trim() || null;
}

/** Strip a trailing `/chat/completions` — the AI SDK appends its own path. */
function toBaseUrl(url: string): string {
  return url.replace(/\/+$/, "").replace(/\/chat\/completions$/, "");
}

/** `CORE_AI_MODEL` wins on every lane; otherwise the reliable agent default. */
function resolveCoreModelId(): string {
  return trimmedEnv("CORE_AI_MODEL") ?? DEFAULT_CORE_MODEL;
}

/**
 * Resolve the transport, model and streaming capability for Core.
 *
 * Lane priority: the dedicated NVIDIA OpenRouter key wins so Core billing stays
 * off the Gemini scan/import key, then the general OpenRouter key, then the
 * Firebase proxy. Model id is independent of `NVIDIA_AI_MODEL` (JSON path only).
 */
export function resolveCoreLane(): CoreLane | null {
  const streamProxyUrl = trimmedEnv("CORE_STREAM_PROXY_URL");
  const modelId = resolveCoreModelId();

  const nvidiaTransport = readNvidiaAiTransport();
  if (nvidiaTransport) {
    return {
      transport: nvidiaTransport,
      modelId,
      canStream: true,
      baseURL: OPENROUTER_BASE_URL,
    };
  }

  const transport = readAiTransport();
  if (!transport) return null;

  if (transport.kind === "direct") {
    return { transport, modelId, canStream: true, baseURL: OPENROUTER_BASE_URL };
  }

  // Proxy lane: only the gen-2 streaming function can pipe a response body.
  if (streamProxyUrl) {
    return {
      transport: { ...transport, url: streamProxyUrl },
      modelId,
      canStream: true,
      baseURL: toBaseUrl(streamProxyUrl),
    };
  }

  return { transport, modelId, canStream: false, baseURL: toBaseUrl(transport.url) };
}

/**
 * `fetch` shim that attaches lane credentials and OpenRouter-specific body
 * fields. This is why the plan picked `@ai-sdk/openai-compatible` over the
 * OpenRouter-specific provider: the proxy needs a freshly minted Google ID
 * token per request, which only a custom fetch can supply.
 */
function coreFetch(lane: CoreLane): typeof fetch {
  return async (input, init) => {
    const headers = new Headers(init?.headers);
    headers.set("Content-Type", "application/json");

    if (lane.transport.kind === "direct") {
      headers.set("Authorization", `Bearer ${lane.transport.apiKey}`);
      headers.set(
        "HTTP-Referer",
        process.env.NEXT_PUBLIC_APP_URL ?? "https://app.myautocore.com",
      );
      headers.set("X-Title", CORE_TITLE);
    } else {
      const proxyHeaders = await resolveProxyAuthHeaders(lane.transport, CORE_TITLE);
      for (const [key, value] of Object.entries(proxyHeaders)) {
        headers.set(key, value);
      }
    }

    // Ask OpenRouter for reasoning tokens. When the model emits none, the
    // stream simply carries no reasoning parts — the UI renders the panel only
    // when a real reasoning part arrives, so nothing is fabricated.
    let body = init?.body;
    if (typeof body === "string") {
      try {
        const parsed = JSON.parse(body) as Record<string, unknown>;
        parsed.reasoning = { enabled: true, effort: "medium", exclude: false };
        body = JSON.stringify(parsed);
      } catch {
        // Non-JSON body: forward untouched.
      }
    }

    return fetch(input, { ...init, headers, body });
  };
}

export type CoreLanguageModel = {
  model: LanguageModel;
  modelId: string;
  canStream: boolean;
};

/**
 * The language model Core talks to, wrapped for honest streaming.
 *
 * - `extractReasoningMiddleware` runs on every path: models on this lane wrap
 *   chain-of-thought in `<think>` tags (the JSON transport has a regex for
 *   exactly this), which `@ai-sdk/openai-compatible` does not map to reasoning
 *   parts on its own.
 * - `simulateStreamingMiddleware` is added only when the transport cannot
 *   stream, so the route's `smoothStream` still delivers word-by-word text
 *   instead of one blob.
 */
export function coreLanguageModel(): CoreLanguageModel {
  const lane = resolveCoreLane();
  if (!lane) throw new Error(CORE_AI_NOT_CONFIGURED);

  const provider = createOpenAICompatible({
    name: "openrouter",
    baseURL: lane.baseURL,
    fetch: coreFetch(lane),
  });

  const middleware = [extractReasoningMiddleware({ tagName: "think" })];
  if (!lane.canStream) middleware.unshift(simulateStreamingMiddleware());

  return {
    model: wrapLanguageModel({ model: provider.chatModel(lane.modelId), middleware }),
    modelId: lane.modelId,
    canStream: lane.canStream,
  };
}

/** Whether Core has any usable transport — lets the route fail fast and clearly. */
export function isCoreConfigured(): boolean {
  return resolveCoreLane() !== null;
}
