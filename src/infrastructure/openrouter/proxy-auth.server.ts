import "server-only";

import type { AiTransport } from "@/infrastructure/openrouter/transport";

/**
 * Auth headers for the Firebase OpenRouter proxy.
 *
 * Extracted so both the JSON transport (`chat-completions.server.ts`) and the
 * streaming transport (`core-model.server.ts`) mint credentials the same way —
 * the proxy is the only path that exists in production, where no OpenRouter key
 * is present on Vercel.
 */
export async function resolveProxyAuthHeaders(
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
