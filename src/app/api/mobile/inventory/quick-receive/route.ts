import { NextRequest, NextResponse } from "next/server";

import { MobileAccessError, verifyMobileAccess } from "@/lib/auth/verify-mobile-access.server";
import { quickReceiveMobileStock } from "@/lib/mobile/quick-receive.server";

export const runtime = "nodejs";

type QuickReceivePayload = {
  itemId?: unknown;
  quantity?: unknown;
  warehouseId?: unknown;
  unitCost?: unknown;
  idempotencyKey?: unknown;
};

export async function POST(request: NextRequest) {
  try {
    const access = await verifyMobileAccess(request, "inventory_edit");
    const body = (await request.json()) as QuickReceivePayload;

    const itemId = typeof body.itemId === "string" ? body.itemId.trim() : "";
    if (!itemId) {
      return NextResponse.json({ error: "Укажите позицию" }, { status: 400 });
    }

    const quantity = Number(body.quantity);
    const warehouseId = typeof body.warehouseId === "string" ? body.warehouseId.trim() : undefined;
    const unitCost = body.unitCost == null ? undefined : Number(body.unitCost);
    const idempotencyKey =
      typeof body.idempotencyKey === "string" ? body.idempotencyKey.trim() : undefined;

    const result = await quickReceiveMobileStock({
      companyId: access.companyId,
      itemId,
      quantity,
      warehouseId,
      unitCost: Number.isFinite(unitCost) ? unitCost : undefined,
      actorUserId: access.uid,
      idempotencyKey,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof MobileAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[mobile/inventory/quick-receive]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Не удалось принять на склад" },
      { status: 500 },
    );
  }
}
