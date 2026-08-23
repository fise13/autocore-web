import { NextRequest, NextResponse } from "next/server";

import { MobileAccessError, verifyMobileAccess } from "@/lib/auth/verify-mobile-access.server";
import { recordScanEvent, type ScanEventSource } from "@/lib/mobile/scan-events.server";
import { disambiguateMobileScan } from "@/lib/mobile/scan-disambiguate.server";
import { primaryScanCode } from "@/lib/mobile/scan-normalize";
import { resolveMobileScan } from "@/lib/mobile/scan-resolve.server";

export const runtime = "nodejs";

type ScanResolvePayload = {
  barcode?: unknown;
  source?: unknown;
  disambiguate?: unknown;
};

function parseSource(value: unknown): ScanEventSource {
  if (value === "photo" || value === "manual" || value === "ocr") return value;
  return "camera";
}

export async function POST(request: NextRequest) {
  try {
    const access = await verifyMobileAccess(request, "inventory_view");
    const body = (await request.json()) as ScanResolvePayload;
    const barcode = typeof body.barcode === "string" ? body.barcode.trim() : "";
    if (!barcode) {
      return NextResponse.json({ error: "Provide a barcode or a part number" }, { status: 400 });
    }

    const source = parseSource(body.source);
    const useDisambiguate = body.disambiguate === true;

    const result = useDisambiguate
      ? await disambiguateMobileScan(access.companyId, barcode)
      : await resolveMobileScan(access.companyId, barcode, {
          strictBarcode: source === "camera",
        });

    void recordScanEvent({
      companyId: access.companyId,
      userId: access.uid,
      rawPayload: barcode,
      normalizedPayload: primaryScanCode(barcode),
      matchType: result.matchType,
      itemId: result.item?.id ?? null,
      confidence: result.confidence,
      source,
      outcome: result.found ? "auto_accept" : result.candidates.length > 0 ? "user_picked_candidate" : "unknown",
      aiReasoning: result.aiReasoning,
    }).catch((error) => console.warn("[scan/resolve] event log failed", error));

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof MobileAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[mobile/scan/resolve]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not find that item" },
      { status: 500 },
    );
  }
}
