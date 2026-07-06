import { NextRequest, NextResponse } from "next/server";

import { AccountAccessError, verifyAccountAccess } from "@/lib/auth/verify-account-access";
import { previewInviteByToken } from "@/infrastructure/firestore/invite-org-service.server";
import { orgErrorResponse } from "@autocore/org";
import {
  assertResolveEmailRateLimit,
  EmailRateLimitError,
  markResolveEmailLookup,
} from "@/lib/email/rate-limit";

export const runtime = "nodejs";

function readClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await context.params;
    const preview = await previewInviteByToken(token);
    return NextResponse.json({ preview });
  } catch (error) {
    const mapped = orgErrorResponse(error);
    return NextResponse.json(
      { code: mapped.code, error: mapped.error, title: mapped.title, action: mapped.action },
      { status: mapped.status },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { token?: unknown };
    const token = typeof body.token === "string" ? body.token.trim() : "";
    if (!token) {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    }

    const clientIp = readClientIp(request);
    await assertResolveEmailRateLimit(clientIp, `invite:${token}`);

    const preview = await previewInviteByToken(token);
    await markResolveEmailLookup(clientIp, `invite:${token}`);

    return NextResponse.json({
      email: preview.email,
      companyName: preview.companyName,
      preview,
    });
  } catch (error) {
    if (error instanceof EmailRateLimitError) {
      return NextResponse.json(
        { error: error.message, retryAfterSec: error.retryAfterSec },
        { status: 429 },
      );
    }
    const mapped = orgErrorResponse(error);
    return NextResponse.json(
      { code: mapped.code, error: mapped.error, title: mapped.title, action: mapped.action, preview: null },
      { status: mapped.status },
    );
  }
}
