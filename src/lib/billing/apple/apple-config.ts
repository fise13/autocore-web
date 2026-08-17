import type { BillingInterval } from "@/domain/billing";

import { acceptedEnvironments, type AppleEnvironment } from "./transaction-payload";

/**
 * App Store product ids and the App Store Server API credentials.
 *
 * The product ids mirror `autocore-mobile/lib/subscriptions/catalog.ts` — the
 * app decides what to *offer*, the server decides what to *honour*, and a SKU
 * the server does not know is refused rather than granted. `apple-config.test.ts`
 * fails if the two lists drift.
 */

export const APPLE_PRODUCTS = {
  "com.autocore.pro.monthly": { planId: "pro_monthly", interval: "monthly" },
  "com.autocore.pro.yearly": { planId: "pro_yearly", interval: "yearly" },
} as const satisfies Record<string, { planId: string; interval: BillingInterval }>;

export type AppleProductId = keyof typeof APPLE_PRODUCTS;

export const APPLE_PRODUCT_IDS = Object.keys(APPLE_PRODUCTS) as AppleProductId[];

export function planForAppleProduct(
  productId: string | undefined,
): { planId: string; interval: BillingInterval } | null {
  if (!productId) return null;
  return APPLE_PRODUCTS[productId as AppleProductId] ?? null;
}

export function appleEnvironmentsAccepted(): AppleEnvironment[] {
  return acceptedEnvironments({
    nodeEnv: process.env.NODE_ENV,
    strictProductionOnly:
      process.env.APPLE_STRICT_PRODUCTION_ONLY?.trim().toLowerCase() === "true",
  });
}

export type AppStoreApiCredentials = {
  /** App Store Connect API key id (Keys → In-App Purchase). */
  keyId: string;
  /** App Store Connect issuer UUID. */
  issuerId: string;
  /** PKCS#8 EC private key (.p8 contents). */
  privateKey: string;
  bundleId: string;
};

/**
 * Newlines survive a `.p8` badly in most dashboards, so an escaped `\n` form is
 * accepted alongside the real thing.
 */
function readPrivateKey(): string | null {
  const raw = process.env.APPLE_APP_STORE_PRIVATE_KEY?.trim();
  if (!raw) return null;
  return raw.includes("\\n") ? raw.replace(/\\n/g, "\n") : raw;
}

export function readAppStoreCredentials(): AppStoreApiCredentials | null {
  const keyId = process.env.APPLE_APP_STORE_KEY_ID?.trim();
  const issuerId = process.env.APPLE_APP_STORE_ISSUER_ID?.trim();
  const privateKey = readPrivateKey();
  const bundleId = process.env.APPLE_APP_BUNDLE_ID?.trim() || "com.wise.autocore.mobile";

  if (!keyId || !issuerId || !privateKey) return null;
  return { keyId, issuerId, privateKey, bundleId };
}

export class AppStoreNotConfiguredError extends Error {
  constructor() {
    super(
      "App Store Server API is not configured. Set APPLE_APP_STORE_KEY_ID, " +
        "APPLE_APP_STORE_ISSUER_ID and APPLE_APP_STORE_PRIVATE_KEY.",
    );
    this.name = "AppStoreNotConfiguredError";
  }
}

export function requireAppStoreCredentials(): AppStoreApiCredentials {
  const credentials = readAppStoreCredentials();
  if (!credentials) throw new AppStoreNotConfiguredError();
  return credentials;
}
