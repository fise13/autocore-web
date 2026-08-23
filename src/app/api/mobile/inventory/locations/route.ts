import { NextRequest, NextResponse } from "next/server";

import { MobileAccessError, verifyMobileAccess } from "@/lib/auth/verify-mobile-access.server";
import { listMobileWarehouseLocations } from "@/lib/mobile/relocate-stock.server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const access = await verifyMobileAccess(request, "inventory_view");
    const warehouseId = request.nextUrl.searchParams.get("warehouseId")?.trim() ?? "";
    if (!warehouseId) {
      return NextResponse.json({ error: "Provide a warehouse" }, { status: 400 });
    }

    const locations = await listMobileWarehouseLocations({
      companyId: access.companyId,
      warehouseId,
    });

    return NextResponse.json({ locations });
  } catch (error) {
    if (error instanceof MobileAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[mobile/inventory/locations]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load locations" },
      { status: 500 },
    );
  }
}
