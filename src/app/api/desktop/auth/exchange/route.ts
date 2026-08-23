import { NextRequest, NextResponse } from "next/server";

import { exchangeDesktopAuthCode } from "@/lib/desktop/deck-auth-codes.server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { code?: string };
    const code = body.code?.trim();
    if (!code) {
      return NextResponse.json({ error: "Provide a code" }, { status: 400 });
    }

    const payload = await exchangeDesktopAuthCode(code);
    return NextResponse.json(payload);
  } catch (error) {
    console.error("[desktop/auth/exchange]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not exchange the code" },
      { status: 400 },
    );
  }
}
