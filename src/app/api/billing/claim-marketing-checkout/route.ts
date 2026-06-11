import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import { AccountAccessError, verifyAccountAccess } from "@/lib/auth/verify-account-access";
import { verifyCompanyOwner } from "@/lib/auth/verify-company-manager.server";
import { normalizeCompanyId } from "@/lib/company-id";
import { stripePriceIds } from "@/lib/stripe/prices";
import {
  checkoutSessionEmail,
  retrieveCheckoutSession,
  stripeObjectId,
} from "@/lib/stripe/stripe-server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const access = await verifyAccountAccess(request);
    const body = (await request.json()) as { companyId?: string; sessionId?: string };
    const companyId = normalizeCompanyId(body.companyId ?? "");
    const sessionId = body.sessionId?.trim() ?? "";

    if (!companyId || !sessionId) {
      return NextResponse.json({ error: "Нужны companyId и sessionId" }, { status: 400 });
    }

    await verifyCompanyOwner(access.uid, companyId);

    const session = await retrieveCheckoutSession(sessionId);
    if (session.metadata?.flow !== "marketing_pro") {
      return NextResponse.json({ error: "Сессия оплаты не относится к маркетинговому тарифу" }, { status: 400 });
    }
    if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") {
      return NextResponse.json({ error: "Оплата ещё не завершена" }, { status: 400 });
    }

    const checkoutEmail = checkoutSessionEmail(session);
    const userSnap = await getAdminFirestore().collection("users").doc(access.uid).get();
    const userEmail = String(userSnap.data()?.email ?? "")
      .trim()
      .toLowerCase();
    if (checkoutEmail && userEmail && checkoutEmail !== userEmail) {
      return NextResponse.json(
        { error: "Email оплаты не совпадает с email аккаунта" },
        { status: 403 },
      );
    }

    const stripeCustomerId = stripeObjectId(session.customer);
    const stripeSubscriptionId = stripeObjectId(session.subscription);
    const interval = session.metadata?.interval === "yearly" ? "yearly" : "monthly";
    const priceId = interval === "yearly" ? stripePriceIds.proYearly : stripePriceIds.proMonthly;

    const db = getAdminFirestore();
    const subscriptionRef = db
      .collection("companies")
      .doc(companyId)
      .collection("billing")
      .doc("subscription");

    await subscriptionRef.set(
      {
        plan: "pro",
        status: "active",
        proActive: true,
        provider: "stripe",
        stripeCustomerId,
        stripeSubscriptionId,
        priceId,
        billingInterval: interval,
        stripeUpdatedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        marketingCheckoutSessionId: sessionId,
      },
      { merge: true },
    );

    return NextResponse.json({ proActive: true });
  } catch (error) {
    if (error instanceof AccountAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Не удалось привязать подписку";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
