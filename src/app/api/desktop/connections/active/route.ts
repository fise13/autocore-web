import { NextRequest, NextResponse } from "next/server";

import {
  DesktopAccessError,
  verifyDesktopAccess,
} from "@/lib/auth/verify-desktop-access.server";
import { setDeskActiveConnection } from "@/lib/desktop/desk-connections.server";

export const runtime = "nodejs";

export async function PUT(request: NextRequest) {
  try {
    const access = await verifyDesktopAccess(request, "inventory_view");
    const body = (await request.json()) as { connectionId?: string | null };
    const connectionId =
      typeof body.connectionId === "string" && body.connectionId.trim()
        ? body.connectionId.trim()
        : null;

    await setDeskActiveConnection(access.uid, connectionId);
    return NextResponse.json({ activeConnectionId: connectionId });
  } catch (error) {
    if (error instanceof DesktopAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[desktop/connections/active]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Не удалось сохранить активное подключение" },
      { status: 500 },
    );
  }
}
