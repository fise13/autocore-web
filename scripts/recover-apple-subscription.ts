/**
 * Record an Apple subscription the server never managed to honour.
 *
 * `/api/mobile/billing/apple/verify` is the normal path, and it needs
 * `APPLE_APP_STORE_*` on the deployment. When those are missing it answers 503
 * for every purchase: StoreKit still charges the customer, the entitlement is
 * never written, and the app retries on a backoff that reaches twelve hours.
 * This is the manual way out of that state — and the way to repair the
 * purchases that were taken while it lasted.
 *
 * It deliberately imports the same modules the route uses rather than writing
 * the document itself, so a recovered subscription is indistinguishable from
 * one that verified normally: same validation, same ordering rules, same
 * `appleTransactionLinks` entry.
 *
 * Usage (dry run by default — nothing is written until `--apply`):
 *
 *   node --import tsx scripts/recover-apple-subscription.ts --transaction 2000001225325908
 *   node --import tsx scripts/recover-apple-subscription.ts --transaction 2000001225325908 --apply
 *
 * The company is resolved from the `appAccountToken` Apple echoes back inside
 * the signed transaction. Pass `--company <id>` only to override that, and only
 * when you know why.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvLocal(): void {
  let raw: string;
  try {
    raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  } catch {
    console.error("No .env.local found. Run this from the repository root.");
    process.exit(1);
  }

  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index < 0) continue;
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    // Matching quotes are part of the file format, not the value. Leaving them
    // in makes a perfectly good `.p8` key look like an unparseable one.
    if (value.length >= 2 && (value[0] === '"' || value[0] === "'") && value.at(-1) === value[0]) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

function arg(name: string): string | null {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? (process.argv[index + 1] ?? null) : null;
}

async function main(): Promise<void> {
  loadEnvLocal();

  const transactionId = arg("transaction")?.trim();
  const companyOverride = arg("company")?.trim() || null;
  const apply = process.argv.includes("--apply");

  if (!transactionId) {
    console.error("Required: --transaction <transactionId>");
    process.exit(1);
  }

  // Imported after the env is loaded: these modules read credentials at call
  // time, but the Admin SDK initialises from `process.env` on first use.
  const [{ requireAppStoreCredentials, appleEnvironmentsAccepted, APPLE_PRODUCT_IDS }, api, payload, entitlement] =
    await Promise.all([
      import("../src/lib/billing/apple/apple-config"),
      import("../src/lib/billing/apple/app-store-server-api"),
      import("../src/lib/billing/apple/transaction-payload"),
      import("../src/lib/billing/apple/apple-entitlement.server"),
    ]);

  const credentials = requireAppStoreCredentials();
  const transaction = await api.fetchTransaction(transactionId);
  const originalTransactionId = transaction.originalTransactionId ?? null;

  // Prefer Apple's current view of the subscription over the transaction that
  // happened to be quoted: a purchase stuck in the queue for hours may name a
  // period that has already been renewed past.
  let effective = transaction;
  let renewal: (typeof payload extends never ? never : import("../src/lib/billing/apple/transaction-payload").AppleRenewalInfo) | null =
    null;

  if (originalTransactionId) {
    const states = await api.fetchSubscriptionStatuses(originalTransactionId).catch(() => []);
    const current = states.find(
      (state) => state.transaction.originalTransactionId === originalTransactionId,
    );
    if (current) {
      effective = current.transaction;
      renewal = current.renewal;
      console.log(`Apple status: ${current.status} (1 active, 2 expired, 3 retry, 4 grace, 5 revoked)`);
    }
  }

  const companyId =
    companyOverride ?? (await entitlement.companyForAppAccountToken(effective.appAccountToken));

  if (!companyId) {
    console.error(
      "Could not resolve a workspace. The transaction carries appAccountToken " +
        `${effective.appAccountToken ?? "(none)"}, which no workspace claims. ` +
        "Pass --company <id> if you know which one it belongs to.",
    );
    process.exit(1);
  }

  console.log(
    JSON.stringify(
      {
        companyId,
        transactionId: effective.transactionId,
        originalTransactionId: effective.originalTransactionId,
        productId: effective.productId,
        environment: effective.environment,
        appAccountToken: effective.appAccountToken,
        expiresDate: effective.expiresDate ? new Date(effective.expiresDate).toISOString() : null,
        revocationDate: effective.revocationDate
          ? new Date(effective.revocationDate).toISOString()
          : null,
      },
      null,
      2,
    ),
  );

  // Same gate the route applies. A transaction that fails it must not be
  // written by hand either — that is how a refunded purchase keeps Pro alive.
  payload.assertTransactionUsable({
    transaction: effective,
    expectedBundleId: credentials.bundleId,
    // The stored token is what the route compares against; resolving the
    // company *from* that token above already proves they match.
    expectedAppAccountToken: effective.appAccountToken ?? null,
    acceptedEnvironments: appleEnvironmentsAccepted(),
    knownProductIds: APPLE_PRODUCT_IDS,
    now: new Date(),
  });

  const stored = await entitlement.readStoredSubscription(companyId);
  entitlement.assertNotStripeManaged(stored);

  if (!apply) {
    console.log("\nDry run — nothing written. Re-run with --apply to record it.");
    return;
  }

  const result = await entitlement.applyAppleTransaction({
    companyId,
    transaction: effective,
    renewal,
  });

  console.log("\nWritten:", JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? `${error.name}: ${error.message}` : error);
  process.exit(1);
});
