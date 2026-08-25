import * as functions from "firebase-functions/v1";

import {
  OPENROUTER_URL,
  REGION,
  isAuthorized,
  openRouterKey,
  projectId,
} from "./openrouter-auth";

/**
 * OpenRouter lives behind Firebase so the API key exists in exactly one place.
 *
 * Callers (Vercel / local Next) hold no OpenRouter credential. They either send
 * `x-ai-proxy-key` (optional shared secret) or a Google ID token for this
 * function URL minted by the project's Firebase Admin service account. Deployed
 * in `europe-west1` because Vercel functions are pinned to `fra1`.
 *
 * This gen-1 function BUFFERS the whole upstream body, so it cannot stream.
 * Core uses `openrouterStreamProxy` (gen-2) when `CORE_STREAM_PROXY_URL` is set.
 */
const aiFunctions = functions.region("europe-west1").runWith({
  // AI completions are slow and mostly spent waiting on the network, so the
  // budget is time, not memory.
  timeoutSeconds: 120,
  memory: "256MB",
});

const FUNCTION_NAME = "openrouterProxy";

/**
 * Header values are ByteStrings: one em dash in a caller's title makes this
 * function's own `fetch` throw before the request leaves. The caller sanitizes
 * too; this is the half that cannot be redeployed by fixing the caller.
 */
function headerSafeTitle(title: string | undefined): string {
  const value = (title ?? "")
    .replace(/[\u2012-\u2015]/g, "-")
    .replace(/[^\x20-\x7e]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
  return value || "AutoCore";
}

function expectedAudience(project: string): string {
  return (
    process.env.AI_PROXY_URL?.trim() ||
    `https://${REGION}-${project}.cloudfunctions.net/${FUNCTION_NAME}`
  );
}

export const openrouterProxy = aiFunctions.https.onRequest(async (request, response) => {
  if (request.method !== "POST") {
    response.status(405).json({ error: "Method not allowed" });
    return;
  }

  const authorized = await isAuthorized({
    getHeader: (name) => request.get(name) ?? undefined,
    audiences: [expectedAudience(projectId())],
    label: FUNCTION_NAME,
  });
  if (!authorized) {
    response.status(401).json({ error: "Unauthorized" });
    return;
  }

  const apiKey = openRouterKey();
  if (!apiKey) {
    console.error("[openrouterProxy] OPENROUTER_API_KEY is not set");
    response.status(500).json({
      error: "OpenRouter не настроен в Firebase Functions. Задайте OPENROUTER_API_KEY.",
    });
    return;
  }

  const payload = request.body;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    response.status(400).json({ error: "Expected a JSON completion payload" });
    return;
  }

  // Model is configured once in Functions env when set — callers do not need
  // OPENROUTER_MODEL / SCAN_AI_MODEL on Vercel for the default path.
  const body: Record<string, unknown> = { ...(payload as Record<string, unknown>) };
  const modelFromEnv = process.env.OPENROUTER_MODEL?.trim();
  if (modelFromEnv) {
    body.model = modelFromEnv;
  }

  // The caller owns its own timeout; this one only stops the function from
  // sitting on a dead socket until the platform kills it.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 110_000);

  try {
    const upstream = await fetch(OPENROUTER_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.APP_URL || "https://app.myautocore.com",
        "X-Title": headerSafeTitle(request.get("x-ai-title") ?? undefined),
      },
      body: JSON.stringify(body),
    });

    // Pass the upstream status and body through untouched — the caller already
    // knows how to map OpenRouter's error shapes.
    const text = await upstream.text();
    response.status(upstream.status).type("application/json").send(text);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      response.status(504).json({ error: "OpenRouter timeout" });
      return;
    }
    console.error("[openrouterProxy]", error);
    response.status(502).json({ error: "OpenRouter request failed" });
  } finally {
    clearTimeout(timer);
  }
});
