import { OAuth2Client } from "google-auth-library";
import * as functions from "firebase-functions/v1";

/**
 * OpenRouter lives behind Firebase so the API key exists in exactly one place.
 *
 * Callers (Vercel / local Next) hold no OpenRouter credential. They either send
 * `x-ai-proxy-key` (optional shared secret) or a Google ID token for this
 * function URL minted by the project's Firebase Admin service account. Deployed
 * in `europe-west1` because Vercel functions are pinned to `fra1`.
 */
const aiFunctions = functions.region("europe-west1").runWith({
  // AI completions are slow and mostly spent waiting on the network, so the
  // budget is time, not memory.
  timeoutSeconds: 120,
  memory: "256MB",
});

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const REGION = "europe-west1";
const FUNCTION_NAME = "openrouterProxy";

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

function projectId(): string {
  const fromEnv =
    process.env.GCLOUD_PROJECT?.trim() || process.env.GCP_PROJECT?.trim() || "";
  if (fromEnv) return fromEnv;

  const raw = process.env.FIREBASE_CONFIG?.trim();
  if (!raw) return "";
  try {
    return (JSON.parse(raw) as { projectId?: string }).projectId?.trim() || "";
  } catch {
    return "";
  }
}

function expectedAudience(project: string): string {
  return (
    process.env.AI_PROXY_URL?.trim() ||
    `https://${REGION}-${project}.cloudfunctions.net/${FUNCTION_NAME}`
  );
}

function isProjectServiceAccount(email: string, project: string): boolean {
  if (!email || !project) return false;
  if (!email.endsWith(".iam.gserviceaccount.com") && !email.endsWith("@appspot.gserviceaccount.com")) {
    return false;
  }
  return email.includes(project);
}

async function isAuthorized(request: functions.Request): Promise<boolean> {
  const secret = proxySecret();
  const presented = request.get("x-ai-proxy-key");
  // Length check first so the comparison below cannot leak length via timing.
  if (secret && presented && presented.length === secret.length && presented === secret) {
    return true;
  }

  const authHeader = request.get("authorization") || "";
  const match = /^Bearer\s+(\S+)$/i.exec(authHeader);
  if (!match) return false;

  const project = projectId();
  if (!project) {
    console.error("[openrouterProxy] project id is not available for ID token verify");
    return false;
  }

  try {
    const client = new OAuth2Client();
    const ticket = await client.verifyIdToken({
      idToken: match[1],
      audience: expectedAudience(project),
    });
    const email = ticket.getPayload()?.email?.trim() || "";
    return isProjectServiceAccount(email, project);
  } catch (error) {
    console.warn("[openrouterProxy] ID token verify failed", error);
    return false;
  }
}

export const openrouterProxy = aiFunctions.https.onRequest(async (request, response) => {
  if (request.method !== "POST") {
    response.status(405).json({ error: "Method not allowed" });
    return;
  }

  if (!(await isAuthorized(request))) {
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
        "X-Title": request.get("x-ai-title") || "AutoCore",
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
