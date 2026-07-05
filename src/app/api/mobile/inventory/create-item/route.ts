import { NextRequest, NextResponse } from "next/server";

import { MobileAccessError, verifyMobileAccess } from "@/lib/auth/verify-mobile-access.server";
import { createMobileInventoryItem } from "@/lib/mobile/create-inventory-item.server";

export const runtime = "nodejs";

type CreateItemPayload = {
  barcode?: unknown;
  sku?: unknown;
  name?: unknown;
  brandName?: unknown;
  warehouseLocation?: unknown;
  unit?: unknown;
  sellPrice?: unknown;
  purchasePrice?: unknown;
  initialQuantity?: unknown;
};

function parseOptionalNumber(value: unknown): number | undefined {
  if (value == null || value === "") return undefined;
  const next = Number(value);
  return Number.isFinite(next) ? next : undefined;
}

export async function POST(request: NextRequest) {
  try {
    const access = await verifyMobileAccess(request, "inventory_edit");
    const body = (await request.json()) as CreateItemPayload;

    const barcode = typeof body.barcode === "string" ? body.barcode.trim() : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!barcode) {
      return NextResponse.json({ error: "Укажите штрихкод" }, { status: 400 });
    }
    if (!name) {
      return NextResponse.json({ error: "Укажите название" }, { status: 400 });
    }

    const result = await createMobileInventoryItem({
      companyId: access.companyId,
      actorUserId: access.uid,
      barcode,
      sku: typeof body.sku === "string" ? body.sku.trim() : undefined,
      name,
      brandName: typeof body.brandName === "string" ? body.brandName.trim() : undefined,
      warehouseLocation:
        typeof body.warehouseLocation === "string" ? body.warehouseLocation.trim() : undefined,
      unit: typeof body.unit === "string" ? body.unit.trim() : undefined,
      sellPrice: parseOptionalNumber(body.sellPrice),
      purchasePrice: parseOptionalNumber(body.purchasePrice),
      initialQuantity: parseOptionalNumber(body.initialQuantity),
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof MobileAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[mobile/inventory/create-item]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Не удалось создать товар" },
      { status: 500 },
    );
  }
}
