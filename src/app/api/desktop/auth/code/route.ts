import { NextRequest, NextResponse } from "next/server";

import {
  DesktopAccessError,
  verifyDesktopAccess,
} from "@/lib/auth/verify-desktop-access.server";
import { createDesktopAuthCode } from "@/lib/desktop/deck-auth-codes.server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const access = await verifyDesktopAccess(request, "inventory_view");
    const body = (await request.json().catch(() => ({}))) as { idToken?: string };
    const idToken = body.idToken?.trim();
    if (!idToken) {
      return NextResponse.json({ error: "Требуется idToken" }, { status: 400 });
    }

    const code = await createDesktopAuthCode({
      uid: access.uid,
      companyId: access.companyId,
      idToken,
    });

    return NextResponse.json({ code, expiresInSec: 300 });
  } catch (error) {
    if (error instanceof DesktopAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[desktop/auth/code]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Не удалось создать код" },
      { status: 500 },
    );
  }
}
