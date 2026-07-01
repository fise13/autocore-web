import { NextRequest, NextResponse } from "next/server";

import {
  DesktopAccessError,
  verifyDesktopAccess,
} from "@/lib/auth/verify-desktop-access.server";
import {
  deleteDeskConnection,
  setDeskActiveConnection,
  upsertDeskConnection,
} from "@/lib/desktop/desk-connections.server";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const access = await verifyDesktopAccess(request, "inventory_view");
    const { id } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;
    const label = String(body.label ?? "").trim();
    if (!label) {
      return NextResponse.json({ error: "Укажите название" }, { status: 400 });
    }

    const connection = await upsertDeskConnection(access.uid, {
      id,
      pluginId: String(body.pluginId ?? ""),
      platform: String(body.platform ?? "") as "kolesa" | "olx" | "instagram",
      label,
      storeName: typeof body.storeName === "string" ? body.storeName : undefined,
      accentColor: typeof body.accentColor === "string" ? body.accentColor : undefined,
      createdAt: typeof body.createdAt === "string" ? body.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ connection });
  } catch (error) {
    if (error instanceof DesktopAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[desktop/connections/:id]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Не удалось обновить подключение" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const access = await verifyDesktopAccess(request, "inventory_view");
    const { id } = await context.params;
    await deleteDeskConnection(access.uid, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof DesktopAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[desktop/connections/:id]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Не удалось удалить подключение" },
      { status: 500 },
    );
  }
}
