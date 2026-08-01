import * as functions from "firebase-functions/v1";

/**
 * OpenRouter lives behind Firebase so the API key exists in exactly one place.
 *
 * Vercel holds no AI credential — it sends the completion request here with a
 * shared proxy secret, and this function attaches the real key. Deployed in
 * `europe-west1` because the callers are Vercel functions pinned to `fra1`;
 * running it in `us-central1` would add a transatlantic round trip to every
 * AI call.
 */
const aiFunctions = functions.region("europe-west1").runWith({
  // AI completions are slow and mostly spent waiting on the network, so the
  // budget is time, not memory.
  timeoutSeconds: 120,
  memory: "256MB",
});

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

function proxySecret(): string | null {
  return process.env.AI_PROXY_SECRET?.trim() || null;
}

function openRouterKey(): string | null {
  return (
    process.env.OPENROUTER_API_KEY?.trim() ||
    process.env.OPEN_ROUTER_API_KEY?.trim() ||
    null
  );
}

export const openrouterProxy = aiFunctions.https.onRequest(async (request, response) => {
  if (request.method !== "POST") {
    response.status(405).json({ error: "Method not allowed" });
    return;
  }

  const secret = proxySecret();
  if (!secret) {
    console.error("[openrouterProxy] AI_PROXY_SECRET is not set");
    response.status(500).json({ error: "AI proxy is not configured" });
    return;
  }

  const presented = request.get("x-ai-proxy-key");
  // Length check first so the comparison below cannot leak length via timing.
  if (!presented || presented.length !== secret.length || presented !== secret) {
    response.status(401).json({ error: "Unauthorized" });
    return;
  }

  const apiKey = openRouterKey();
  if (!apiKey) {
    console.error("[openrouterProxy] OPENROUTER_API_KEY is not set");
    response.status(500).json({ error: "OpenRouter не настроен. Задайте OPENROUTER_API_KEY." });
    return;
  }

  const payload = request.body;
  if (!payload || typeof payload !== "object") {
    response.status(400).json({ error: "Expected a JSON completion payload" });
    return;
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
        "X-Title": request.get("x-ai-title") || "AutoCore",
      },
      body: JSON.stringify(payload),
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
