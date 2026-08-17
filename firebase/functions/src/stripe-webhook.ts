import { FieldValue, getFirestore, Timestamp } from "firebase-admin/firestore";
import * as functions from "firebase-functions/v1";

import { verifyStripeSignature } from "./stripe-signature";
import {
  retrieveStripeSubscription,
  stripeObjectId,
  subscriptionDocFromStripe,
  type StripeSubscription,
} from "./stripe-shared";

/**
 * Stripe webhook receiver.
 *
 * Before this existed, subscription state only ever moved when a company owner
 * personally loaded the billing screen and the client called
 * `syncCompanyBilling` — a pull that also swallowed its own errors. Nothing in
 * Stripe could reach AutoCore: a failed renewal, a cancellation, a refund or a
 * dispute left `proActive: true` indefinitely, because
 * `refreshInternalSubscription` deliberately skips `provider === "stripe"` and
 * so never expired those records either.
 *
 * This closes that loop. `syncCompanyBilling` stays as the interactive path for
 * the moment right after checkout, when the webhook may not have landed yet.
 */

const HANDLED_EVENTS = new Set([
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.payment_failed",
  "invoice.payment_succeeded",
]);

type StripeEvent = {
  id: string;
  type: string;
  created: number;
  data: { object: Record<string, unknown> };
};

function webhookSecret(): string | null {
  return process.env.STRIPE_WEBHOOK_SECRET?.trim() || null;
}

function stripeSecretKey(): string | null {
  return process.env.STRIPE_SECRET_KEY?.trim() || null;
}

/**
 * Locate the company a subscription belongs to.
 *
 * In-app checkout stamps `companyId` into subscription metadata. The marketing
 * flow cannot — the company does not exist when checkout starts — so those are
 * matched by the subscription id recorded when the purchase was claimed. A
 * marketing subscription that has never been claimed has no company yet and is
 * skipped rather than guessed at.
 */
async function resolveCompanyId(subscription: StripeSubscription): Promise<string | null> {
  const fromMetadata = subscription.metadata?.companyId?.trim();
  if (fromMetadata) return fromMetadata;

  const snap = await getFirestore()
    .collectionGroup("billing")
    .where("stripeSubscriptionId", "==", subscription.id)
    .limit(1)
    .get();

  const doc = snap.docs[0];
  if (!doc) return null;

  // companies/{companyId}/billing/subscription
  return doc.ref.parent.parent?.id ?? null;
}

async function applySubscription(subscription: StripeSubscription, eventCreatedSec: number) {
  const companyId = await resolveCompanyId(subscription);
  if (!companyId) {
    functions.logger.info("[stripe-webhook] no company for subscription", {
      subscriptionId: subscription.id,
    });
    return;
  }

  const ref = getFirestore()
    .collection("companies")
    .doc(companyId)
    .collection("billing")
    .doc("subscription");

  await getFirestore().runTransaction(async (transaction) => {
    const snap = await transaction.get(ref);
    const lastEventSec = snap.data()?.stripeEventAt;
    const lastSec =
      lastEventSec instanceof Timestamp ? lastEventSec.seconds : null;

    // Stripe retries and can deliver out of order; an older event must never
    // overwrite newer state (e.g. a late `updated` undoing a `deleted`).
    if (lastSec !== null && eventCreatedSec < lastSec) {
      functions.logger.info("[stripe-webhook] ignoring stale event", {
        companyId,
        subscriptionId: subscription.id,
      });
      return;
    }

    transaction.set(
      ref,
      {
        ...subscriptionDocFromStripe(subscription),
        stripeEventAt: Timestamp.fromMillis(eventCreatedSec * 1000),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  });

  functions.logger.info("[stripe-webhook] subscription synced", {
    companyId,
    subscriptionId: subscription.id,
    status: subscription.status,
  });
}

/**
 * Invoice events carry only a subscription id, so the subscription itself is
 * fetched to get authoritative status rather than inferring it from the event.
 */
async function applyInvoice(invoice: Record<string, unknown>, eventCreatedSec: number) {
  const subscriptionId = stripeObjectId(
    invoice.subscription as string | { id?: string } | null | undefined,
  );
  if (!subscriptionId) return;

  const secret = stripeSecretKey();
  if (!secret) {
    functions.logger.error("[stripe-webhook] STRIPE_SECRET_KEY missing; cannot fetch subscription");
    return;
  }

  const subscription = await retrieveStripeSubscription(secret, subscriptionId);
  await applySubscription(subscription, eventCreatedSec);
}

export const stripeWebhook = functions
  .region("us-central1")
  .https.onRequest(async (request, response) => {
    if (request.method !== "POST") {
      response.status(405).send("Method Not Allowed");
      return;
    }

    const secret = webhookSecret();
    if (!secret) {
      functions.logger.error("[stripe-webhook] STRIPE_WEBHOOK_SECRET is not configured");
      response.status(500).send("Webhook not configured");
      return;
    }

    const signatureHeader = request.get("stripe-signature");
    if (!signatureHeader) {
      response.status(400).send("Missing stripe-signature");
      return;
    }

    const rawBody = request.rawBody;
    if (!rawBody) {
      functions.logger.error("[stripe-webhook] rawBody unavailable; cannot verify signature");
      response.status(400).send("Missing body");
      return;
    }

    if (!verifyStripeSignature({ rawBody, signatureHeader, secret })) {
      // Anyone can POST here, so an unverified payload is treated as hostile.
      response.status(400).send("Invalid signature");
      return;
    }

    let event: StripeEvent;
    try {
      event = JSON.parse(rawBody.toString("utf8")) as StripeEvent;
    } catch {
      response.status(400).send("Invalid JSON");
      return;
    }

    if (!HANDLED_EVENTS.has(event.type)) {
      // Acknowledge so Stripe stops retrying events we intentionally ignore.
      response.status(200).json({ received: true, handled: false });
      return;
    }

    try {
      if (event.type.startsWith("customer.subscription.")) {
        await applySubscription(
          event.data.object as unknown as StripeSubscription,
          event.created,
        );
      } else {
        await applyInvoice(event.data.object, event.created);
      }

      response.status(200).json({ received: true, handled: true });
    } catch (error) {
      // 5xx tells Stripe to retry; the handler is idempotent so that is safe.
      functions.logger.error("[stripe-webhook] handler failed", {
        eventId: event.id,
        eventType: event.type,
        error: error instanceof Error ? error.message : String(error),
      });
      response.status(500).send("Handler failed");
    }
  });
