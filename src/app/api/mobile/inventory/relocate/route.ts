import { NextRequest, NextResponse } from "next/server";

import { MobileAccessError, verifyMobileAccess } from "@/lib/auth/verify-mobile-access.server";
import { relocateMobileStock } from "@/lib/mobile/relocate-stock.server";

export const runtime = "nodejs";

type RelocatePayload = {
  itemId?: unknown;
  warehouseId?: unknown;
  toLocationId?: unknown;
  toLocationCode?: unknown;
  fromLocationId?: unknown;
  quantity?: unknown;
  idempotencyKey?: unknown;
  reason?: unknown;
};

export async function POST(request: NextRequest) {
  try {
    const access = await verifyMobileAccess(request, "inventory_edit");
    const body = (await request.json()) as RelocatePayload;

    const itemId = typeof body.itemId === "string" ? body.itemId.trim() : "";
    if (!itemId) {
      return NextResponse.json({ error: "Укажите позицию" }, { status: 400 });
    }

    const result = await relocateMobileStock({
      companyId: access.companyId,
      itemId,
      warehouseId: typeof body.warehouseId === "string" ? body.warehouseId.trim() : undefined,
      toLocationId: typeof body.toLocationId === "string" ? body.toLocationId.trim() : undefined,
      toLocationCode:
        typeof body.toLocationCode === "string" ? body.toLocationCode.trim() : undefined,
      fromLocationId:
        typeof body.fromLocationId === "string" ? body.fromLocationId.trim() : undefined,
      quantity: body.quantity == null ? undefined : Number(body.quantity),
      idempotencyKey:
        typeof body.idempotencyKey === "string" ? body.idempotencyKey.trim() : undefined,
      reason: typeof body.reason === "string" ? body.reason.trim() : undefined,
      actorUserId: access.uid,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof MobileAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[mobile/inventory/relocate]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Не удалось переместить" },
      { status: 500 },
    );
  }
}
