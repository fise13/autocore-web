import { NextRequest, NextResponse } from "next/server";

import { AccountAccessError, verifyAccountAccess } from "@/lib/auth/verify-account-access";
import { verifyCompanyOwner } from "@/lib/auth/verify-company-manager.server";
import { isPaddleServerConfigured } from "@/lib/paddle/config";
import { getPaddleInstance } from "@/lib/paddle/get-paddle-instance";
import { paddlePriceIdForInterval, type PaddleBillingInterval } from "@/lib/paddle/prices";

export const runtime = "nodejs";

const DEFAULT_PAYMENT_LINK_HINT =
  "Set the default payment link in the Paddle dashboard (Checkout → Checkout settings). " +
  "For local dev use http://localhost:3000/pricing";

function mapPaddleCheckoutError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("default payment link")) {
    return `Paddle checkout is not ready. ${DEFAULT_PAYMENT_LINK_HINT}`;
  }
  if (message.includes("domain that has been approved")) {
    return (
      "Paddle checkout domain is not approved. Add localhost under Checkout → Website approval " +
      "and set the default payment link to http://localhost:3000/pricing."
    );
  }
  return message || "Failed to start Paddle checkout";
}

function readInterval(value: unknown): PaddleBillingInterval {
  return value === "yearly" ? "yearly" : "monthly";
}

export async function POST(request: NextRequest) {
  try {
    if (!isPaddleServerConfigured()) {
      return NextResponse.json({ error: "Paddle is not configured" }, { status: 503 });
    }

    const body = (await request.json()) as {
      interval?: PaddleBillingInterval;
      companyId?: string;
      customerEmail?: string | null;
      successUrl?: string;
    };

    const interval = readInterval(body.interval);
    const companyId = body.companyId?.trim() || "";
    const customerEmail = body.customerEmail?.trim() || "";

    if (companyId) {
      const access = await verifyAccountAccess(request);
      await verifyCompanyOwner(access.uid, companyId);
    }

    const paddle = getPaddleInstance();
    const transaction = await paddle.transactions.create({
      items: [{ priceId: paddlePriceIdForInterval(interval), quantity: 1 }],
      ...(companyId ? { customData: { company_id: companyId } } : {}),
      ...(customerEmail ? { customer: { email: customerEmail } } : {}),
    });

    const transactionId = transaction.id?.trim();
    if (!transactionId) {
      return NextResponse.json({ error: "Paddle did not return a transaction id" }, { status: 502 });
    }

    return NextResponse.json({ transactionId });
  } catch (error) {
    if (error instanceof AccountAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("[api/billing/paddle/checkout]", error);
    return NextResponse.json({ error: mapPaddleCheckoutError(error) }, { status: 500 });
  }
}
