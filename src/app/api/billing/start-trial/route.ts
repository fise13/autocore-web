import { NextRequest, NextResponse } from "next/server";

import { AccountAccessError, verifyAccountAccess } from "@/lib/auth/verify-account-access";

export const runtime = "nodejs";

/**
 * Homemade 14-day grants are retired. Web/desktop trial is a Paddle checkout
 * with a trial period on the price. iOS still uses StoreKit introductory offers.
 */
export async function POST(request: NextRequest) {
  try {
    await verifyAccountAccess(request);
    return NextResponse.json(
      { error: "Trial starts through Paddle checkout", started: false, proActive: false },
      { status: 410 },
    );
  } catch (error) {
    if (error instanceof AccountAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: "Trial starts through Paddle checkout", started: false, proActive: false },
      { status: 410 },
    );
  }
}
