import { NextRequest, NextResponse } from "next/server";

import { EmailRateLimitError, reserveVerificationEmailSlot } from "@/lib/email/rate-limit";
import { getNoreplyFrom, getResend, isResendConfigured } from "@/lib/email/resend-client";
import { buildVerificationCodeEmail } from "@/lib/email/templates/verification-code-email";
import {
  generateVerificationCode,
  storeVerificationCode,
} from "@/lib/email/verification-code.server";
import { AccountAccessError, verifyAccountAccess } from "@/lib/auth/verify-account-access";
import { getAdminAuth } from "@/infrastructure/firebase/admin";

export const runtime = "nodejs";

function hasPasswordProvider(providerData: Array<{ providerId?: string }>): boolean {
  return providerData.some((provider) => provider.providerId === "password");
}

export async function POST(request: NextRequest) {
  try {
    if (!isResendConfigured()) {
      return NextResponse.json({ error: "Email service not configured" }, { status: 503 });
    }

    const access = await verifyAccountAccess(request);
    const adminAuth = getAdminAuth();
    const userRecord = await adminAuth.getUser(access.uid);

    if (!userRecord.email) {
      return NextResponse.json({ error: "У аккаунта нет email" }, { status: 400 });
    }

    if (!hasPasswordProvider(userRecord.providerData)) {
      return NextResponse.json({ error: "Верификация не требуется для этого способа входа" }, { status: 400 });
    }

    if (userRecord.emailVerified) {
      return NextResponse.json({ ok: true, alreadyVerified: true });
    }

    await reserveVerificationEmailSlot(access.uid);

    const code = generateVerificationCode();
    await storeVerificationCode(access.uid, code);

    const message = buildVerificationCodeEmail({
      code,
      userName: userRecord.displayName,
      recipientEmail: userRecord.email,
    });

    const resend = getResend();
    await resend.emails.send({
      from: getNoreplyFrom(),
      to: userRecord.email,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AccountAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof EmailRateLimitError) {
      return NextResponse.json(
        { error: error.message, retryAfterSec: error.retryAfterSec },
        { status: 429 },
      );
    }
    console.error("[auth/send-verification-email]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send verification email" },
      { status: 500 },
    );
  }
}
