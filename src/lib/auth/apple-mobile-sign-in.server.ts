import "server-only";

import { createHash, createPublicKey, verify as verifySignature } from "node:crypto";

import { getAdminAuth } from "@/infrastructure/firebase/admin";
import { verifiedAppleEmail } from "@/lib/auth/apple-identity";

const MOBILE_BUNDLE_ID = "com.wise.autocore.mobile";
const APPLE_WEB_CLIENT_ID =
  process.env.NEXT_PUBLIC_APPLE_WEB_CLIENT_ID?.trim() || "com.wise.autocore.web";
const APPLE_ISSUER = "https://appleid.apple.com";
const APPLE_JWKS_URL = "https://appleid.apple.com/auth/keys";

export type MobileAppleSignInInput = {
  idToken: string;
  rawNonce: string;
  authorizationCode?: string | null;
  email?: string | null;
  fullName?: string | null;
};

type IdentityToolkitSignInResponse = {
  localId?: string;
  idToken?: string;
  refreshToken?: string;
  error?: { message?: string; code?: number };
};

type AppleJwk = {
  kty: string;
  kid: string;
  use?: string;
  alg?: string;
  crv?: string;
  x?: string;
  y?: string;
};

let jwksCache: { keys: AppleJwk[]; fetchedAt: number } | null = null;

function decodeJwtPart(part: string): Record<string, unknown> {
  return JSON.parse(Buffer.from(part, "base64url").toString("utf8")) as Record<string, unknown>;
}

function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function sha256Base64Url(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("base64url");
}

function nonceMatchesToken(rawNonce: string, tokenNonce: unknown): boolean {
  if (typeof tokenNonce !== "string" || !tokenNonce.trim()) return false;
  const normalized = tokenNonce.trim();
  return normalized === sha256Hex(rawNonce) || normalized === sha256Base64Url(rawNonce);
}

function isNonceError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /missing.?or.?invalid.?nonce|INVALID_IDP_RESPONSE|17094/i.test(message);
}

function firebaseApiKey(): string {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("NEXT_PUBLIC_FIREBASE_API_KEY is not configured");
  }
  return apiKey;
}

function firebaseAuthHandlerUri(): string {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();
  if (!projectId) {
    throw new Error("NEXT_PUBLIC_FIREBASE_PROJECT_ID is not configured");
  }
  return `https://${projectId}.firebaseapp.com/__/auth/handler`;
}

async function getAppleJwks(): Promise<AppleJwk[]> {
  if (jwksCache && Date.now() - jwksCache.fetchedAt < 3_600_000) {
    return jwksCache.keys;
  }
  const response = await fetch(APPLE_JWKS_URL, { next: { revalidate: 3600 } });
  if (!response.ok) {
    throw new Error(`Apple JWKS fetch failed (${response.status})`);
  }
  const payload = (await response.json()) as { keys?: AppleJwk[] };
  const keys = payload.keys ?? [];
  jwksCache = { keys, fetchedAt: Date.now() };
  return keys;
}

async function verifyAppleIdToken(
  idToken: string,
  audiences: string[],
  rawNonce: string,
): Promise<Record<string, unknown>> {
  const [headerPart, payloadPart, signaturePart] = idToken.split(".");
  if (!headerPart || !payloadPart || !signaturePart) {
    throw new Error("Malformed Apple identity token");
  }

  const header = decodeJwtPart(headerPart);
  const payload = decodeJwtPart(payloadPart);
  const issuer = String(payload.iss ?? "");
  const audience = String(payload.aud ?? "");
  const subject = String(payload.sub ?? "");
  const expiresAt = Number(payload.exp ?? 0);

  if (issuer !== APPLE_ISSUER) {
    throw new Error("Invalid Apple token issuer");
  }
  if (!audiences.includes(audience)) {
    throw new Error("Invalid Apple token audience");
  }
  if (!subject) {
    throw new Error("Apple token is missing subject");
  }
  if (!Number.isFinite(expiresAt) || expiresAt * 1000 < Date.now()) {
    throw new Error("Apple token expired");
  }

  const keys = await getAppleJwks();
  const jwk = keys.find((entry) => entry.kid === header.kid);
  if (!jwk) {
    throw new Error("Apple signing key not found");
  }

  const key = createPublicKey({ key: jwk, format: "jwk" });
  const signed = Buffer.from(`${headerPart}.${payloadPart}`);
  const signature = Buffer.from(signaturePart, "base64url");
  const valid = verifySignature(null, signed, { key, dsaEncoding: "ieee-p1363" }, signature);
  if (!valid) {
    throw new Error("Invalid Apple token signature");
  }

  if (payload.nonce != null && !nonceMatchesToken(rawNonce, payload.nonce)) {
    throw new Error("Apple token nonce mismatch");
  }

  return payload;
}

async function signInWithAppleIdp(
  idToken: string,
  rawNonce: string,
  requestUri: string,
): Promise<IdentityToolkitSignInResponse> {
  const postBody = [
    `id_token=${encodeURIComponent(idToken)}`,
    `nonce=${encodeURIComponent(rawNonce)}`,
    "providerId=apple.com",
  ].join("&");

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=${firebaseApiKey()}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        postBody,
        requestUri,
        returnIdpCredential: true,
        returnSecureToken: true,
      }),
    },
  );

  const payload = (await response.json()) as IdentityToolkitSignInResponse;
  if (!response.ok || !payload.localId) {
    const message = payload.error?.message ?? `signInWithIdp failed (${response.status})`;
    throw new Error(message);
  }

  return payload;
}

function requestUrisForAudience(audience: string): string[] {
  const uris = new Set<string>();
  if (audience === MOBILE_BUNDLE_ID) {
    uris.add(`https://${MOBILE_BUNDLE_ID}`);
  }
  if (audience === APPLE_WEB_CLIENT_ID) {
    uris.add(firebaseAuthHandlerUri());
  }
  uris.add(`https://${MOBILE_BUNDLE_ID}`);
  uris.add(firebaseAuthHandlerUri());
  return [...uris];
}

async function resolveFirebaseUidFromApple(
  appleSub: string,
  email?: string | null,
  fullName?: string | null,
): Promise<string> {
  const auth = getAdminAuth();
  const existing = await auth.getUsers([{ providerId: "apple.com", providerUid: appleSub }]);
  if (existing.users[0]?.uid) {
    return existing.users[0].uid;
  }

  if (email) {
    try {
      const byEmail = await auth.getUserByEmail(email);
      if (byEmail.uid) {
        await auth.updateUser(byEmail.uid, {
          providerToLink: {
            providerId: "apple.com",
            uid: appleSub,
            email,
          },
        });
        return byEmail.uid;
      }
    } catch {
      // No user with this email yet.
    }
  }

  const created = await auth.createUser({
    email: email ?? undefined,
    displayName: fullName ?? undefined,
    providerToLink: {
      providerId: "apple.com",
      uid: appleSub,
      email: email ?? undefined,
    },
  });
  return created.uid;
}

async function signInViaVerifiedAppleToken(
  input: MobileAppleSignInInput,
): Promise<{ customToken: string }> {
  const idToken = input.idToken.trim();
  const rawNonce = input.rawNonce.trim();
  const payload = await verifyAppleIdToken(
    idToken,
    [MOBILE_BUNDLE_ID, APPLE_WEB_CLIENT_ID],
    rawNonce,
  );
  const appleSub = String(payload.sub ?? "");
  const appleEmail = verifiedAppleEmail(payload);
  const uid = await resolveFirebaseUidFromApple(appleSub, appleEmail, input.fullName);

  const profileUpdate: { displayName?: string; email?: string } = {};
  if (input.fullName?.trim()) profileUpdate.displayName = input.fullName.trim();
  if (appleEmail) profileUpdate.email = appleEmail;
  if (Object.keys(profileUpdate).length > 0) {
    try {
      await getAdminAuth().updateUser(uid, profileUpdate);
    } catch (error) {
      console.warn("[mobile/auth/apple] profile update skipped:", error);
    }
  }

  const customToken = await getAdminAuth().createCustomToken(uid);
  return { customToken };
}

export async function completeMobileAppleSignIn(
  input: MobileAppleSignInInput,
): Promise<{ customToken: string }> {
  const idToken = input.idToken.trim();
  const rawNonce = input.rawNonce.trim();

  if (!idToken) {
    throw new Error("Apple identity token is missing");
  }
  if (!rawNonce) {
    throw new Error("Apple nonce is missing");
  }

  const audience = String(decodeJwtPart(idToken.split(".")[1] ?? "").aud ?? MOBILE_BUNDLE_ID);

  // Native iOS tokens (bundle id audience) often fail signInWithIdp nonce checks — verify JWT first.
  if (audience === MOBILE_BUNDLE_ID) {
    try {
      return await signInViaVerifiedAppleToken(input);
    } catch (error) {
      console.warn("[mobile/auth/apple] verified token path failed, trying signInWithIdp", error);
    }
  }

  let lastError: unknown = null;

  for (const requestUri of requestUrisForAudience(audience)) {
    try {
      const result = await signInWithAppleIdp(idToken, rawNonce, requestUri);
      const uid = result.localId;
      if (!uid) {
        throw new Error("Firebase did not return a user id");
      }

      const profileUpdate: { displayName?: string } = {};
      if (input.fullName?.trim()) profileUpdate.displayName = input.fullName.trim();
      if (Object.keys(profileUpdate).length > 0) {
        try {
          await getAdminAuth().updateUser(uid, profileUpdate);
        } catch (error) {
          console.warn("[mobile/auth/apple] profile update skipped:", error);
        }
      }

      const customToken = await getAdminAuth().createCustomToken(uid);
      return { customToken };
    } catch (error) {
      lastError = error;
      if (!isNonceError(error)) {
        throw error;
      }
      console.warn("[mobile/auth/apple] signInWithIdp nonce error", { requestUri, error });
    }
  }

  if (isNonceError(lastError)) {
    return signInViaVerifiedAppleToken(input);
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Could not confirm sign-in with Apple");
}
