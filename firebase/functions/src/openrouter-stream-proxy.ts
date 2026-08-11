import { onRequest } from "firebase-functions/v2/https";

import {
  OPENROUTER_URL,
  REGION,
  isAuthorized,
  openRouterKey,
  projectId,
} from "./openrouter-auth";

const FUNCTION_NAME = "openrouterStreamProxy";

/**
 * Streaming OpenRouter proxy for Core.
 *
 * Exists because `openrouterProxy` is a **gen-1** function: gen-1 buffers the
 * whole response (`const text = await upstream.text(); response.send(text)`),
 * so a `stream: true` completion would still arrive as one blob. Gen-2 runs on
 * Cloud Run and can pipe the upstream body straight through, which is what
 * makes token-by-token rendering possible in production.
 *
 * Two deliberate differences from the gen-1 proxy:
 *
 * 1. **The caller's `model` is never overwritten.** Gen-1 does
 *    `if (modelFromEnv) body.model = modelFromEnv`, which silently forces Core
 *    onto whatever model the scan/import pipeline is configured with.
 * 2. The response body is piped, not buffered, and the upstream `Content-Type`
 *    (`text/event-stream`) is preserved.
 */
export const openrouterStreamProxy = onRequest(
  {
    region: REGION,
    timeoutSeconds: 300,
    memory: "256MiB",
    cors: false,
  },
  async (request, response) => {
    if (request.method !== "POST") {
      response.status(405).json({ error: "Method not allowed" });
      return;
    }

    const project = projectId();
    const authorized = await isAuthorized({
      getHeader: (name) => request.get(name) ?? undefined,
      audiences: [
        process.env.CORE_STREAM_PROXY_URL?.trim() || "",
        `https://${REGION}-${project}.cloudfunctions.net/${FUNCTION_NAME}`,
      ],
      label: FUNCTION_NAME,
    });
    if (!authorized) {
      response.status(401).json({ error: "Unauthorized" });
      return;
    }

    const apiKey = openRouterKey();
    if (!apiKey) {
      console.error(`[${FUNCTION_NAME}] OPENROUTER_API_KEY is not set`);
      response
        .status(500)
        .json({ error: "OpenRouter is not configured in Firebase Functions." });
      return;
    }

    const payload = request.body;
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      response.status(400).json({ error: "Expected a JSON completion payload" });
      return;
    }

    // The caller owns its own timeout; this one only stops the function from
    // sitting on a dead socket until the platform kills it.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 290_000);
    // A client disconnect must tear down the upstream request, or a cancelled
    // chat keeps burning tokens until the model finishes on its own.
    response.on("close", () => controller.abort());

    try {
      const upstream = await fetch(OPENROUTER_URL, {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.APP_URL || "https://app.myautocore.com",
          "X-Title": request.get("x-ai-title") || "AutoCore",
        },
        // Forwarded untouched — notably `model` and `tools`.
        body: JSON.stringify(payload),
      });

      response.status(upstream.status);
      const contentType = upstream.headers.get("content-type");
      if (contentType) response.setHeader("Content-Type", contentType);
      // Defeat any proxy buffering between Cloud Run and the caller.
      response.setHeader("Cache-Control", "no-cache, no-transform");
      response.setHeader("X-Accel-Buffering", "no");

      if (!upstream.body) {
        response.end();
        return;
      }

      const reader = upstream.body.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        response.write(Buffer.from(value));
        // Express/Node may hold small chunks; flush when the platform allows.
        (response as unknown as { flush?: () => void }).flush?.();
      }
      response.end();
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        if (!response.headersSent) response.status(504).json({ error: "OpenRouter timeout" });
        else response.end();
        return;
      }
      console.error(`[${FUNCTION_NAME}]`, error);
      if (!response.headersSent) response.status(502).json({ error: "OpenRouter request failed" });
      else response.end();
    } finally {
      clearTimeout(timer);
    }
  },
);
