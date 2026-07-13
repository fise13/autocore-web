import { NextRequest, NextResponse } from "next/server";

import { MobileAccessError, verifyMobileAccess } from "@/lib/auth/verify-mobile-access.server";
import { getMobileLocationContents } from "@/lib/mobile/location-contents.server";

export const runtime = "nodejs";

type Params = { params: Promise<{ locationId: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const access = await verifyMobileAccess(request, "inventory_view");
    const { locationId } = await params;
    const result = await getMobileLocationContents({
      companyId: access.companyId,
      locationId,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof MobileAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Не удалось загрузить место";
    const status = message === "Место не найдено" ? 404 : 500;
    if (status === 500) console.error("[mobile/inventory/locations/:id]", error);
    return NextResponse.json({ error: message }, { status });
  }
}
