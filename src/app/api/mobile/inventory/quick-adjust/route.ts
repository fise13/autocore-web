import { NextRequest, NextResponse } from "next/server";

import { MobileAccessError, verifyMobileAccess } from "@/lib/auth/verify-mobile-access.server";
import { quickAdjustMobileStock } from "@/lib/mobile/quick-adjust.server";

export const runtime = "nodejs";

type QuickAdjustPayload = {
  itemId?: unknown;
  direction?: unknown;
  quantity?: unknown;
  warehouseId?: unknown;
  idempotencyKey?: unknown;
  reason?: unknown;
};

export async function POST(request: NextRequest) {
  try {
    const access = await verifyMobileAccess(request, "inventory_edit");
    const body = (await request.json()) as QuickAdjustPayload;

    const itemId = typeof body.itemId === "string" ? body.itemId.trim() : "";
    if (!itemId) {
      return NextResponse.json({ error: "Укажите позицию" }, { status: 400 });
    }

    const direction = body.direction === "decrease" ? "decrease" : "increase";
    const quantity = Number(body.quantity);
    const warehouseId = typeof body.warehouseId === "string" ? body.warehouseId.trim() : undefined;
    const idempotencyKey =
      typeof body.idempotencyKey === "string" ? body.idempotencyKey.trim() : undefined;
    const reason = typeof body.reason === "string" ? body.reason.trim() : undefined;

    const result = await quickAdjustMobileStock({
      companyId: access.companyId,
      itemId,
      direction,
      quantity,
      warehouseId,
      actorUserId: access.uid,
      idempotencyKey,
      reason,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof MobileAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[mobile/inventory/quick-adjust]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Не удалось изменить остаток" },
      { status: 500 },
    );
  }
}
