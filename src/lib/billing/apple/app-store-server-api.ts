import "server-only";

import { createSign } from "node:crypto";

import { requireAppStoreCredentials, type AppStoreApiCredentials } from "./apple-config";
import { decodeAppleJwsUnsafe } from "./verify-jws";
import type { AppleRenewalInfo, AppleTransaction } from "./transaction-payload";

/**
 * Apple's App Store Server API — the authoritative source for a transaction.
 *
 * The app also hands us a signed transaction, but a client is never the source
 * of truth about whether it paid: a JWS captured from one Apple ID could be
 * replayed by another install. So the client's transaction id is treated as a
 * lookup key only, and the transaction itself is re-fetched from Apple over an
 * authenticated TLS call before anything is granted.
 *
 * Both hosts are tried because a TestFlight build transacts against Sandbox
 * while talking to the production server; a transaction that is genuinely
 * Sandbox-only 404s on the production host and is found on the second call.
 */

const PRODUCTION_HOST = "https://api.storekit.itunes.apple.com";
const SANDBOX_HOST = "https://api.storekit-sandbox.itunes.apple.com";

/** Apple rejects tokens older than an hour; well inside that. */
const TOKEN_TTL_SECONDS = 15 * 60;

function base64Url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** ES256 JWT with the `appstoreconnect-v1` audience Apple requires. */
function signApiToken(credentials: AppStoreApiCredentials, now: Date): string {
  const issuedAt = Math.floor(now.getTime() / 1000);
  const header = base64Url(
    JSON.stringify({ alg: "ES256", kid: credentials.keyId, typ: "JWT" }),
  );
  const payload = base64Url(
    JSON.stringify({
      iss: credentials.issuerId,
      iat: issuedAt,
      exp: issuedAt + TOKEN_TTL_SECONDS,
      aud: "appstoreconnect-v1",
      bid: credentials.bundleId,
    }),
  );

  const signer = createSign("SHA256");
  signer.update(`${header}.${payload}`);
  signer.end();
  // `dsaEncoding: 'ieee-p1363'` is the raw r||s form JOSE wants; the default
  // DER output would be rejected by Apple as a malformed signature.
  const signature = signer.sign({ key: credentials.privateKey, dsaEncoding: "ieee-p1363" });

  return `${header}.${payload}.${base64Url(signature)}`;
}

export class AppStoreApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AppStoreApiError";
    this.status = status;
  }
}

async function callAppStore<T>(path: string): Promise<T> {
  const credentials = requireAppStoreCredentials();
  const token = signApiToken(credentials, new Date());

  let lastStatus = 0;
  let lastBody = "";

  for (const host of [PRODUCTION_HOST, SANDBOX_HOST]) {
    const response = await fetch(`${host}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      // Entitlement decisions must never be served from a cache.
      cache: "no-store",
    });

    if (response.ok) {
      return (await response.json()) as T;
    }

    lastStatus = response.status;
    lastBody = await response.text().catch(() => "");

    // 404 on production is the expected answer for a Sandbox transaction —
    // fall through and try the sandbox host. Anything else is a real failure.
    if (response.status !== 404) break;
  }

  throw new AppStoreApiError(
    `App Store Server API ${path} failed (${lastStatus})${lastBody ? `: ${lastBody.slice(0, 200)}` : ""}`,
    lastStatus,
  );
}

type TransactionInfoResponse = { signedTransactionInfo?: string };

/**
 * Fetch one transaction by id.
 *
 * The response body is a JWS that arrived over an authenticated TLS call to
 * Apple, so it is decoded rather than signature-verified — see
 * `decodeAppleJwsUnsafe`. Webhook payloads take the verifying path instead.
 */
export async function fetchTransaction(transactionId: string): Promise<AppleTransaction> {
  const body = await callAppStore<TransactionInfoResponse>(
    `/inApps/v1/transactions/${encodeURIComponent(transactionId)}`,
  );
  if (!body.signedTransactionInfo) {
    throw new AppStoreApiError("App Store returned no transaction info", 502);
  }
  return decodeAppleJwsUnsafe<AppleTransaction>(body.signedTransactionInfo);
}

type SubscriptionStatusResponse = {
  data?: Array<{
    lastTransactions?: Array<{
      status?: number;
      signedTransactionInfo?: string;
      signedRenewalInfo?: string;
    }>;
  }>;
};

export type AppleSubscriptionState = {
  transaction: AppleTransaction;
  renewal: AppleRenewalInfo | null;
  /** Apple's status: 1 active, 2 expired, 3 billing retry, 4 grace, 5 revoked. */
  status: number | null;
};

/**
 * Current state of every subscription in the group for one original
 * transaction. Used by restore and by the notification handler, where the
 * transaction in the payload may already be stale by the time we process it.
 */
export async function fetchSubscriptionStatuses(
  originalTransactionId: string,
): Promise<AppleSubscriptionState[]> {
  const body = await callAppStore<SubscriptionStatusResponse>(
    `/inApps/v1/subscriptions/${encodeURIComponent(originalTransactionId)}`,
  );

  const states: AppleSubscriptionState[] = [];
  for (const group of body.data ?? []) {
    for (const item of group.lastTransactions ?? []) {
      if (!item.signedTransactionInfo) continue;
      states.push({
        transaction: decodeAppleJwsUnsafe<AppleTransaction>(item.signedTransactionInfo),
        renewal: item.signedRenewalInfo
          ? decodeAppleJwsUnsafe<AppleRenewalInfo>(item.signedRenewalInfo)
          : null,
        status: item.status ?? null,
      });
    }
  }
  return states;
}
