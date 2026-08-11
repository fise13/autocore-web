import { OAuth2Client } from "google-auth-library";

/**
 * Shared authorization for both OpenRouter proxies.
 *
 * Callers (Vercel / local Next) hold no OpenRouter credential. They present
 * either `x-ai-proxy-key` (optional shared secret) or a Google ID token minted
 * by the project's Firebase Admin service account for this function's URL.
 */
export const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
export const REGION = "europe-west1";

export function proxySecret(): string | null {
  return process.env.AI_PROXY_SECRET?.trim() || null;
}

export function openRouterKey(): string | null {
  return (
    process.env.OPENROUTER_API_KEY?.trim() ||
    process.env.OPEN_ROUTER_API_KEY?.trim() ||
    null
  );
}

export function projectId(): string {
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

export function isProjectServiceAccount(email: string, project: string): boolean {
  if (!email || !project) return false;
  if (
    !email.endsWith(".iam.gserviceaccount.com") &&
    !email.endsWith("@appspot.gserviceaccount.com")
  ) {
    return false;
  }
  return email.includes(project);
}

type AuthorizeOptions = {
  /** Header lookup — Express `req.get` on gen-1 and gen-2 alike. */
  getHeader: (name: string) => string | undefined;
  /**
   * Accepted ID-token audiences. Gen-1 and gen-2 functions live at different
   * URLs, so each proxy passes its own; both are accepted while callers roll
   * over from one to the other.
   */
  audiences: string[];
  /** Log prefix so failures are attributable to the right function. */
  label: string;
};

export async function isAuthorized({
  getHeader,
  audiences,
  label,
}: AuthorizeOptions): Promise<boolean> {
  const secret = proxySecret();
  const presented = getHeader("x-ai-proxy-key");
  // Length check first so the comparison below cannot leak length via timing.
  if (secret && presented && presented.length === secret.length && presented === secret) {
    return true;
  }

  const authHeader = getHeader("authorization") || "";
  const match = /^Bearer\s+(\S+)$/i.exec(authHeader);
  if (!match) return false;

  const project = projectId();
  if (!project) {
    console.error(`[${label}] project id is not available for ID token verify`);
    return false;
  }

  try {
    const client = new OAuth2Client();
    const ticket = await client.verifyIdToken({
      idToken: match[1],
      audience: audiences.filter(Boolean),
    });
    const email = ticket.getPayload()?.email?.trim() || "";
    return isProjectServiceAccount(email, project);
  } catch (error) {
    console.warn(`[${label}] ID token verify failed`, error);
    return false;
  }
}
