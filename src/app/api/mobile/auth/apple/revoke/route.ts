import { NextRequest, NextResponse } from "next/server";

import { MobileAccessError, verifyMobileAuth } from "@/lib/auth/verify-mobile-access.server";
import {
  AppleRevokeNotConfiguredError,
  revokeAppleAccount,
} from "@/lib/auth/apple-revoke.server";

export const runtime = "nodejs";

type RevokeBody = {
  authorizationCode?: string | null;
};

/**
 * Revokes a Sign in with Apple grant as part of account deletion.
 *
 * Called by the app immediately after it re-authenticates with Apple and before
 * it deletes the Firebase user — Apple authorization codes are single-use and
 * expire within minutes, so the code has to be spent right away.
 *
 * A missing revocation key is reported as `configured: false` with a 200 rather
 * than an error: the user asked to delete their account, and refusing to delete
 * it because a server key is absent is the worse outcome. The app surfaces the
 * distinction so the gap is visible instead of silent.
 */
export async function POST(request: NextRequest) {
  try {
    await verifyMobileAuth(request);

    const body = (await request.json().catch(() => ({}))) as RevokeBody;
    const authorizationCode = body.authorizationCode?.trim() ?? "";

    if (!authorizationCode) {
      return NextResponse.json(
        { error: "authorizationCode from Sign in with Apple is required" },
        { status: 400 },
      );
    }

    await revokeAppleAccount(authorizationCode);
    return NextResponse.json({ ok: true, configured: true, revoked: true });
  } catch (error) {
    if (error instanceof MobileAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    if (error instanceof AppleRevokeNotConfiguredError) {
      console.error("[mobile/auth/apple/revoke] not configured:", error.message);
      return NextResponse.json({ ok: true, configured: false, revoked: false });
    }

    console.error("[mobile/auth/apple/revoke]", error);
    return NextResponse.json(
      { error: "Could not revoke Apple access", configured: true, revoked: false },
      { status: 502 },
    );
  }
}
