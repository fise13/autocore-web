import { NextRequest, NextResponse } from "next/server";

import { MobileAccessError, verifyMobileAccess } from "@/lib/auth/verify-mobile-access.server";
import { resolveMobileScan } from "@/lib/mobile/scan-resolve.server";

export const runtime = "nodejs";

type ScanResolvePayload = {
  barcode?: unknown;
};

export async function POST(request: NextRequest) {
  try {
    const access = await verifyMobileAccess(request, "inventory_view");
    const body = (await request.json()) as ScanResolvePayload;
    const barcode = typeof body.barcode === "string" ? body.barcode.trim() : "";
    if (!barcode) {
      return NextResponse.json({ error: "Укажите штрихкод или артикул" }, { status: 400 });
    }

    const result = await resolveMobileScan(access.companyId, barcode);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof MobileAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[mobile/scan/resolve]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Не удалось найти позицию" },
      { status: 500 },
    );
  }
}
