import { NextRequest, NextResponse } from "next/server";

import { getAdminAuth } from "@/infrastructure/firebase/admin";
import {
  assertResolveEmailRateLimit,
  EmailRateLimitError,
  markResolveEmailLookup,
} from "@/lib/email/rate-limit";

export const runtime = "nodejs";

type ResolveEmailResponse = {
  exists: boolean;
  methods: string[];
};

function readClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { email?: unknown };
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const clientIp = readClientIp(request);
    await assertResolveEmailRateLimit(clientIp, email);

    try {
      const user = await getAdminAuth().getUserByEmail(email);
      const methods = [
        ...new Set(
          user.providerData
            .map((provider) => provider.providerId)
            .filter((providerId) => providerId.length > 0),
        ),
      ];

      if (methods.length === 0) {
        methods.push("password");
      }

      await markResolveEmailLookup(clientIp, email);

      return NextResponse.json({
        exists: true,
        methods,
      } satisfies ResolveEmailResponse);
    } catch (error) {
      const code =
        typeof error === "object" && error !== null && "code" in error
          ? String((error as { code?: string }).code)
          : "";
      if (code === "auth/user-not-found") {
        await markResolveEmailLookup(clientIp, email);
        return NextResponse.json({
          exists: false,
          methods: [],
        } satisfies ResolveEmailResponse);
      }
      throw error;
    }
  } catch (error) {
    if (error instanceof EmailRateLimitError) {
      return NextResponse.json(
        { error: error.message, retryAfterSec: error.retryAfterSec },
        { status: 429 },
      );
    }
    console.error("[auth/resolve-email]", error);
    return NextResponse.json(
      { error: "Email lookup unavailable" },
      { status: 503 },
    );
  }
}
