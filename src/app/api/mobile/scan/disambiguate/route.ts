import { NextRequest, NextResponse } from "next/server";

import { MobileAccessError, verifyMobileAccess } from "@/lib/auth/verify-mobile-access.server";
import { recordScanEvent } from "@/lib/mobile/scan-events.server";
import { disambiguateMobileScan } from "@/lib/mobile/scan-disambiguate.server";
import { primaryScanCode } from "@/lib/mobile/scan-normalize";

export const runtime = "nodejs";

type ScanDisambiguatePayload = {
  barcode?: unknown;
};

export async function POST(request: NextRequest) {
  try {
    const access = await verifyMobileAccess(request, "inventory_view");
    const body = (await request.json()) as ScanDisambiguatePayload;
    const barcode = typeof body.barcode === "string" ? body.barcode.trim() : "";
    if (!barcode) {
      return NextResponse.json({ error: "Provide a barcode or a part number" }, { status: 400 });
    }

    const result = await disambiguateMobileScan(access.companyId, barcode);

    void recordScanEvent({
      companyId: access.companyId,
      userId: access.uid,
      rawPayload: barcode,
      normalizedPayload: primaryScanCode(barcode),
      matchType: result.matchType,
      itemId: result.item?.id ?? null,
      confidence: result.confidence,
      source: "manual",
      outcome: result.found ? "auto_accept" : "unknown",
      aiReasoning: result.aiReasoning,
    }).catch((error) => console.warn("[scan/disambiguate] event log failed", error));

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof MobileAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[mobile/scan/disambiguate]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not narrow down the item" },
      { status: 500 },
    );
  }
}
