import "server-only";

import { createSign } from "node:crypto";

import { normalizeApplePrivateKey } from "@/lib/billing/apple/apple-config";

/**
 * Sign in with Apple token revocation.
 *
 * Apple requires an app that offers Sign in with Apple to revoke the user's
 * tokens when their account is deleted — deleting the Firebase user alone
 * leaves the app listed under the person's Apple ID forever, and App Review
 * checks for it under guideline 5.1.1(v).
 *
 * The credentials here are the *Sign in with Apple* key (Certificates,
 * Identifiers & Profiles → Keys → "Sign in with Apple"), which is a different
 * key from the App Store Connect / In-App Purchase one in `APPLE_APP_STORE_*`.
 * Only the `.p8` normalizer is shared.
 */

const APPLE_AUDIENCE = "https://appleid.apple.com";
const APPLE_TOKEN_URL = "https://appleid.apple.com/auth/token";
const APPLE_REVOKE_URL = "https://appleid.apple.com/auth/revoke";

/** Apple caps client secrets at six months; a short life is fine and safer. */
const CLIENT_SECRET_TTL_SECONDS = 10 * 60;

/** Native iOS authorization codes are issued to the app's bundle id. */
const DEFAULT_MOBILE_CLIENT_ID = "com.wise.autocore.mobile";

export type AppleSignInCredentials = {
  /** Key id of the "Sign in with Apple" key. */
  keyId: string;
  /** Apple Developer team id. */
  teamId: string;
  /** PKCS#8 EC private key (.p8 contents). */
  privateKey: string;
  /** Bundle id for native codes, Services id for web codes. */
  clientId: string;
};

export class AppleRevokeNotConfiguredError extends Error {
  constructor() {
    super(
      "Sign in with Apple revocation is not configured. Set APPLE_SIGN_IN_KEY_ID, " +
        "APPLE_SIGN_IN_TEAM_ID and APPLE_SIGN_IN_PRIVATE_KEY.",
    );
    this.name = "AppleRevokeNotConfiguredError";
  }
}

export function readAppleSignInCredentials(): AppleSignInCredentials | null {
  const keyId = process.env.APPLE_SIGN_IN_KEY_ID?.trim();
  const teamId =
    process.env.APPLE_SIGN_IN_TEAM_ID?.trim() || process.env.APPLE_TEAM_ID?.trim();
  const privateKey = normalizeApplePrivateKey(process.env.APPLE_SIGN_IN_PRIVATE_KEY);
  const clientId =
    process.env.APPLE_SIGN_IN_CLIENT_ID?.trim() ||
    process.env.APPLE_APP_BUNDLE_ID?.trim() ||
    DEFAULT_MOBILE_CLIENT_ID;

  if (!keyId || !teamId || !privateKey) return null;
  return { keyId, teamId, privateKey, clientId };
}

export function appleRevocationConfigured(): boolean {
  return readAppleSignInCredentials() !== null;
}

function base64Url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** ES256 JWT Apple accepts as `client_secret` on its OAuth endpoints. */
function signClientSecret(credentials: AppleSignInCredentials, now: Date): string {
  const issuedAt = Math.floor(now.getTime() / 1000);
  const header = base64Url(JSON.stringify({ alg: "ES256", kid: credentials.keyId }));
  const payload = base64Url(
    JSON.stringify({
      iss: credentials.teamId,
      iat: issuedAt,
      exp: issuedAt + CLIENT_SECRET_TTL_SECONDS,
      aud: APPLE_AUDIENCE,
      sub: credentials.clientId,
    }),
  );

  const signer = createSign("SHA256");
  signer.update(`${header}.${payload}`);
  signer.end();
  // Raw r||s, not DER — Apple rejects the default encoding as malformed.
  const signature = signer.sign({ key: credentials.privateKey, dsaEncoding: "ieee-p1363" });

  return `${header}.${payload}.${base64Url(signature)}`;
}

type AppleTokenResponse = {
  refresh_token?: string;
  access_token?: string;
  error?: string;
  error_description?: string;
};

async function postForm(url: string, body: Record<string, string>): Promise<Response> {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body).toString(),
  });
}

/**
 * Trades the one-shot authorization code from `AppleAuthentication.signInAsync`
 * for a refresh token, which is what `/auth/revoke` actually accepts.
 */
async function exchangeAuthorizationCode(
  credentials: AppleSignInCredentials,
  authorizationCode: string,
): Promise<{ token: string; hint: "refresh_token" | "access_token" }> {
  const response = await postForm(APPLE_TOKEN_URL, {
    client_id: credentials.clientId,
    client_secret: signClientSecret(credentials, new Date()),
    code: authorizationCode,
    grant_type: "authorization_code",
  });

  const payload = (await response.json().catch(() => ({}))) as AppleTokenResponse;

  if (!response.ok) {
    const detail = payload.error_description || payload.error || `HTTP ${response.status}`;
    throw new Error(`Apple token exchange failed: ${detail}`);
  }

  // Revoking the refresh token invalidates the whole grant. The access token is
  // only a fallback for the rare response that omits the refresh token.
  if (payload.refresh_token) return { token: payload.refresh_token, hint: "refresh_token" };
  if (payload.access_token) return { token: payload.access_token, hint: "access_token" };

  throw new Error("Apple token exchange returned no revocable token");
}

/**
 * Revokes the user's Sign in with Apple grant.
 *
 * `authorizationCode` must come from a *fresh* `signInAsync` call — Apple codes
 * are single-use and expire in about five minutes, which is why the app
 * re-authenticates immediately before deleting.
 */
export async function revokeAppleAccount(authorizationCode: string): Promise<void> {
  const code = authorizationCode.trim();
  if (!code) {
    throw new Error("Apple authorization code is missing");
  }

  const credentials = readAppleSignInCredentials();
  if (!credentials) {
    throw new AppleRevokeNotConfiguredError();
  }

  const { token, hint } = await exchangeAuthorizationCode(credentials, code);

  const response = await postForm(APPLE_REVOKE_URL, {
    client_id: credentials.clientId,
    client_secret: signClientSecret(credentials, new Date()),
    token,
    token_type_hint: hint,
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as AppleTokenResponse;
    const detail = body.error_description || body.error || `HTTP ${response.status}`;
    throw new Error(`Apple token revocation failed: ${detail}`);
  }
}
