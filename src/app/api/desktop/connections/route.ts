import { NextRequest, NextResponse } from "next/server";

import {
  DesktopAccessError,
  verifyDesktopAccess,
} from "@/lib/auth/verify-desktop-access.server";
import {
  listDeskConnections,
  replaceDeskConnections,
  upsertDeskConnection,
} from "@/lib/desktop/desk-connections.server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const access = await verifyDesktopAccess(request, "inventory_view");
    const snapshot = await listDeskConnections(access.uid);
    return NextResponse.json(snapshot);
  } catch (error) {
    if (error instanceof DesktopAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[desktop/connections]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Не удалось загрузить подключения" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await verifyDesktopAccess(request, "inventory_view");
    const body = (await request.json()) as Record<string, unknown>;
    const id = String(body.id ?? "").trim();
    const pluginId = String(body.pluginId ?? "").trim();
    const platform = String(body.platform ?? "").trim();
    const label = String(body.label ?? "").trim();

    if (!id || !pluginId || !platform || !label) {
      return NextResponse.json({ error: "Некорректные данные подключения" }, { status: 400 });
    }

    const connection = await upsertDeskConnection(access.uid, {
      id,
      pluginId,
      platform: platform as "kolesa" | "olx" | "instagram",
      label,
      storeName: typeof body.storeName === "string" ? body.storeName : undefined,
      accentColor: typeof body.accentColor === "string" ? body.accentColor : undefined,
      createdAt: typeof body.createdAt === "string" ? body.createdAt : new Date().toISOString(),
      updatedAt: typeof body.updatedAt === "string" ? body.updatedAt : new Date().toISOString(),
    });

    return NextResponse.json({ connection });
  } catch (error) {
    if (error instanceof DesktopAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[desktop/connections]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Не удалось сохранить подключение" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const access = await verifyDesktopAccess(request, "inventory_view");
    const body = (await request.json()) as {
      connections?: Array<Record<string, unknown>>;
      activeConnectionId?: string | null;
    };

    const connections = Array.isArray(body.connections)
      ? body.connections
          .map((item) => {
            const id = String(item.id ?? "").trim();
            const pluginId = String(item.pluginId ?? "").trim();
            const platform = String(item.platform ?? "").trim();
            const label = String(item.label ?? "").trim();
            if (!id || !pluginId || !platform || !label) return null;
            return {
              id,
              pluginId,
              platform: platform as "kolesa" | "olx" | "instagram",
              label,
              storeName: typeof item.storeName === "string" ? item.storeName : undefined,
              accentColor: typeof item.accentColor === "string" ? item.accentColor : undefined,
              createdAt:
                typeof item.createdAt === "string" ? item.createdAt : new Date().toISOString(),
              updatedAt:
                typeof item.updatedAt === "string" ? item.updatedAt : new Date().toISOString(),
            };
          })
          .filter((item): item is NonNullable<typeof item> => item !== null)
      : [];

    const snapshot = await replaceDeskConnections(
      access.uid,
      connections,
      typeof body.activeConnectionId === "string" ? body.activeConnectionId : null,
    );

    return NextResponse.json(snapshot);
  } catch (error) {
    if (error instanceof DesktopAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[desktop/connections]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Не удалось синхронизировать подключения" },
      { status: 500 },
    );
  }
}
