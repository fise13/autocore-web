import { NextRequest, NextResponse } from "next/server";

import { createMarketingCheckoutSession } from "@/lib/stripe/stripe-server";
import { getAppUrl, getMarketingUrl } from "@/lib/site-urls";
import { StripeBillingInterval } from "@/lib/stripe/prices";

export const runtime = "nodejs";

function resolveInterval(value: unknown): StripeBillingInterval {
  return value === "yearly" ? "yearly" : "monthly";
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { interval?: StripeBillingInterval };
    const interval = resolveInterval(body.interval);
    const appOrigin = getAppUrl().replace(/\/$/, "");
    const marketingOrigin = getMarketingUrl().replace(/\/$/, "");

    const { url, sessionId } = await createMarketingCheckoutSession({
      interval,
      successUrl: `${appOrigin}/login?checkout=success&session_id={CHECKOUT_SESSION_ID}&interval=${interval}&signup=1`,
      cancelUrl: `${marketingOrigin}/pricing?checkout=canceled`,
    });

    return NextResponse.json({ url, sessionId });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Не удалось начать оплату" },
      { status: 500 },
    );
  }
}
