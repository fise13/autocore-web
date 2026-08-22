import { NextRequest, NextResponse } from "next/server";

import { AccountAccessError, verifyAccountAccess } from "@/lib/auth/verify-account-access";
import { verifyCompanyOwner } from "@/lib/auth/verify-company-manager.server";
import { getAppOrigin } from "@/lib/app-url";
import { isPaddleServerConfigured } from "@/lib/paddle/config";
import { getPaddleInstance } from "@/lib/paddle/get-paddle-instance";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    if (!isPaddleServerConfigured()) {
      return NextResponse.json({ error: "Paddle is not configured" }, { status: 503 });
    }

    const access = await verifyAccountAccess(request);
    const body = (await request.json()) as { companyId?: string };
    const companyId = body.companyId?.trim();
    if (!companyId) {
      return NextResponse.json({ error: "companyId is required" }, { status: 400 });
    }

    await verifyCompanyOwner(access.uid, companyId);

    const { getAdminFirestore } = await import("@/infrastructure/firebase/admin");
    const subSnap = await getAdminFirestore()
      .collection("companies")
      .doc(companyId)
      .collection("billing")
      .doc("subscription")
      .get();

    const customerId =
      typeof subSnap.data()?.paddleCustomerId === "string"
        ? subSnap.data()!.paddleCustomerId.trim()
        : "";
    if (!customerId) {
      return NextResponse.json(
        { error: "Paddle customer is not linked yet. Subscribe to Pro first." },
        { status: 412 },
      );
    }

    const subscriptionId =
      typeof subSnap.data()?.paddleSubscriptionId === "string"
        ? subSnap.data()!.paddleSubscriptionId.trim()
        : "";

    const paddle = getPaddleInstance();
    const session = await paddle.customerPortalSessions.create(
      customerId,
      subscriptionId ? [subscriptionId] : [],
    );

    const url =
      session.urls?.general?.overview?.trim() ||
      session.urls?.subscriptions?.[0]?.updateSubscriptionPaymentMethod?.trim() ||
      "";

    if (!url) {
      return NextResponse.json({ error: "Paddle portal URL is unavailable" }, { status: 502 });
    }

    return NextResponse.json({
      url,
      returnOrigin: getAppOrigin(),
    });
  } catch (error) {
    if (error instanceof AccountAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[api/billing/paddle/portal]", error);
    return NextResponse.json({ error: "Failed to open Paddle portal" }, { status: 500 });
  }
}
