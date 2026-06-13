import { NextRequest, NextResponse } from "next/server";

import { rewriteFirebaseActionLink } from "@/lib/email/action-link";
import { buildActionCodeSettings } from "@/lib/email/action-code-settings";
import {
  assertPasswordResetRateLimit,
  EmailRateLimitError,
  markPasswordResetEmailSent,
} from "@/lib/email/rate-limit";
import { getNoreplyFrom, getResend, isResendConfigured } from "@/lib/email/resend-client";
import {
  buildPasswordResetEmailHtml,
  PASSWORD_RESET_EMAIL_SUBJECT,
} from "@/lib/email/templates/password-reset-email";
import { getAdminAuth } from "@/infrastructure/firebase/admin";

export const runtime = "nodejs";

function hasPasswordProvider(providerData: Array<{ providerId?: string }>): boolean {
  return providerData.some((provider) => provider.providerId === "password");
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { email?: unknown };
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Укажите корректный email" }, { status: 400 });
    }

    if (!isResendConfigured()) {
      return NextResponse.json({ ok: true });
    }

    await assertPasswordResetRateLimit(email);

    const adminAuth = getAdminAuth();

    try {
      const userRecord = await adminAuth.getUserByEmail(email);
      if (!hasPasswordProvider(userRecord.providerData)) {
        return NextResponse.json({ ok: true });
      }

      const firebaseResetUrl = await adminAuth.generatePasswordResetLink(
        email,
        buildActionCodeSettings(),
      );
      const resetUrl = rewriteFirebaseActionLink(firebaseResetUrl);
      const resend = getResend();
      await resend.emails.send({
        from: getNoreplyFrom(),
        to: email,
        subject: PASSWORD_RESET_EMAIL_SUBJECT,
        html: buildPasswordResetEmailHtml({
          resetUrl,
          userName: userRecord.displayName,
        }),
      });

      await markPasswordResetEmailSent(email);
    } catch (lookupError) {
      const code =
        lookupError && typeof lookupError === "object" && "code" in lookupError
          ? String((lookupError as { code?: string }).code)
          : "";
      if (code !== "auth/user-not-found") {
        throw lookupError;
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof EmailRateLimitError) {
      return NextResponse.json(
        { error: error.message, retryAfterSec: error.retryAfterSec },
        { status: 429 },
      );
    }
    console.error("[auth/send-password-reset]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send password reset email" },
      { status: 500 },
    );
  }
}
