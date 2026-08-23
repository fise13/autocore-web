import { NextRequest, NextResponse } from "next/server";

import { MobileAccessError, verifyMobileAccess } from "@/lib/auth/verify-mobile-access.server";
import { assignMobileAssetLocation } from "@/lib/mobile/assign-asset-location.server";

export const runtime = "nodejs";

type Body = {
  entityType?: unknown;
  entityId?: unknown;
  toLocationId?: unknown;
  toLocationCode?: unknown;
  warehouseId?: unknown;
};

export async function POST(request: NextRequest) {
  try {
    const access = await verifyMobileAccess(request, "inventory_edit");
    const body = (await request.json()) as Body;

    const entityType = body.entityType === "motor" || body.entityType === "specific" ? body.entityType : null;
    const entityId = typeof body.entityId === "string" ? body.entityId.trim() : "";
    if (!entityType || !entityId) {
      return NextResponse.json({ error: "Provide an entity" }, { status: 400 });
    }

    const result = await assignMobileAssetLocation({
      companyId: access.companyId,
      entityType,
      entityId,
      toLocationId: typeof body.toLocationId === "string" ? body.toLocationId.trim() : undefined,
      toLocationCode:
        typeof body.toLocationCode === "string" ? body.toLocationCode.trim() : undefined,
      warehouseId: typeof body.warehouseId === "string" ? body.warehouseId.trim() : undefined,
      actorUserId: access.uid,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof MobileAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[mobile/assets/assign-location]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not assign the location" },
      { status: 500 },
    );
  }
}
