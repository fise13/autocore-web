/**
 * Backfill subscription docs at companies/{id}/billing/subscription:
 * - sets proActive from legacy plan/status when missing
 * - optionally syncs Stripe-linked companies via callable (manual step documented below)
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json tsx scripts/backfill-billing-subscriptions.ts
 *   GOOGLE_APPLICATION_CREDENTIALS=... tsx scripts/backfill-billing-subscriptions.ts --dry-run
 */

import { getApps, initializeApp, cert, applicationDefault } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

type SubscriptionDoc = {
  plan?: string;
  status?: string;
  proActive?: boolean;
  provider?: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  priceId?: string;
  billingInterval?: string | null;
  updatedAt?: Timestamp;
};

function initAdmin() {
  if (getApps().length > 0) return;

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (clientEmail && privateKey) {
    initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });
    return;
  }

  initializeApp({
    credential: applicationDefault(),
    projectId,
  });
}

function deriveProActive(data: SubscriptionDoc): boolean {
  if (typeof data.proActive === "boolean") return data.proActive;
  if (data.plan !== "pro") return false;
  return data.status === "active" || data.status === "trialing" || data.status === "past_due";
}

function deriveBillingInterval(priceId: string | undefined): "monthly" | "yearly" | null {
  if (!priceId) return null;
  const yearly = process.env.STRIPE_PRICE_PRO_YEARLY || "price_1TbiarHo5bmy0A9LD3SafymR";
  const monthly = process.env.STRIPE_PRICE_PRO_MONTHLY || "price_1TbiZUHo5bmy0A9LC86I6wJJ";
  if (priceId === yearly) return "yearly";
  if (priceId === monthly) return "monthly";
  return null;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  initAdmin();
  const db = getFirestore();

  const companiesSnap = await db.collection("companies").get();
  let scanned = 0;
  let updated = 0;
  let stripeLinked = 0;

  for (const companyDoc of companiesSnap.docs) {
    const subRef = companyDoc.ref.collection("billing").doc("subscription");
    const subSnap = await subRef.get();
    if (!subSnap.exists) continue;

    scanned += 1;
    const data = subSnap.data() as SubscriptionDoc;
    const proActive = deriveProActive(data);
    const billingInterval = data.billingInterval ?? deriveBillingInterval(data.priceId);
    const needsUpdate =
      typeof data.proActive !== "boolean" ||
      (data.billingInterval === undefined && billingInterval !== null) ||
      !data.plan ||
      !data.status;

    if (data.stripeCustomerId) stripeLinked += 1;

    if (!needsUpdate) continue;

    const patch = {
      plan: data.plan === "pro" ? "pro" : "free",
      status: data.status || "active",
      proActive,
      billingInterval,
      updatedAt: Timestamp.now(),
    };

    if (dryRun) {
      console.log(`[dry-run] ${companyDoc.id}`, patch);
    } else {
      await subRef.set(patch, { merge: true });
    }
    updated += 1;
  }

  console.log(`Scanned ${scanned} subscription docs, updated ${updated}, stripe-linked ${stripeLinked}.`);
  if (stripeLinked > 0) {
    console.log(
      "For Stripe-linked companies, run syncCompanyBilling callable per company after deploying Functions fixes.",
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
