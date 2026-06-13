import { NextRequest, NextResponse } from "next/server";

import { AccountAccessError, verifyAccountAccess } from "@/lib/auth/verify-account-access";
import {
  VerificationCodeError,
  verifyEmailVerificationCode,
} from "@/lib/email/verification-code.server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const access = await verifyAccountAccess(request);
    const body = (await request.json()) as { code?: unknown };
    const code = typeof body.code === "string" ? body.code : "";

    await verifyEmailVerificationCode(access.uid, code);

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AccountAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof VerificationCodeError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[auth/verify-email-code]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to verify email code" },
      { status: 500 },
    );
  }
}
