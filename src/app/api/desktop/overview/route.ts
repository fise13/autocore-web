import { NextRequest, NextResponse } from "next/server";

import {
  DesktopAccessError,
  verifyDesktopAccess,
} from "@/lib/auth/verify-desktop-access.server";
import {
  buildDesktopOverview,
  loadDesktopOverviewUser,
} from "@/lib/desktop/build-overview.server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const access = await verifyDesktopAccess(request, "inventory_view");
    const user = await loadDesktopOverviewUser(access.uid);
    if (!user) {
      return NextResponse.json({ error: "Профиль пользователя не найден" }, { status: 403 });
    }

    const overview = await buildDesktopOverview(access.companyId, user);
    return NextResponse.json(overview);
  } catch (error) {
    if (error instanceof DesktopAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[desktop/overview]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Не удалось загрузить обзор" },
      { status: 500 },
    );
  }
}
