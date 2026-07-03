import { NextRequest, NextResponse } from "next/server";

import { MobileAccessError, verifyMobileAccess } from "@/lib/auth/verify-mobile-access.server";
import {
  createBarcodeMappingAdmin,
  recordScanEvent,
  type ScanEventOutcome,
} from "@/lib/mobile/scan-events.server";
import { primaryScanCode } from "@/lib/mobile/scan-normalize";
import { resolveMobileScanForItemId } from "@/lib/mobile/scan-resolve.server";

export const runtime = "nodejs";

type ScanFeedbackPayload = {
  barcode?: unknown;
  itemId?: unknown;
  outcome?: unknown;
  confidence?: unknown;
};

function parseOutcome(value: unknown): ScanEventOutcome {
  if (
    value === "user_picked_candidate" ||
    value === "user_rejected" ||
    value === "created_mapping" ||
    value === "auto_accept" ||
    value === "unknown"
  ) {
    return value;
  }
  return "user_picked_candidate";
}

export async function POST(request: NextRequest) {
  try {
    const access = await verifyMobileAccess(request, "inventory_view");
    const body = (await request.json()) as ScanFeedbackPayload;

    const barcode = typeof body.barcode === "string" ? body.barcode.trim() : "";
    const itemId = typeof body.itemId === "string" ? body.itemId.trim() : "";
    const outcome = parseOutcome(body.outcome);
    const confidence = Number(body.confidence);

    if (!barcode) {
      return NextResponse.json({ error: "Укажите штрихкод" }, { status: 400 });
    }

    if (outcome === "created_mapping") {
      if (!itemId) {
        return NextResponse.json({ error: "Укажите позицию" }, { status: 400 });
      }
      await createBarcodeMappingAdmin({
        companyId: access.companyId,
        barcode,
        itemId,
        userId: access.uid,
      });
    }

    if (outcome === "user_picked_candidate" && itemId) {
      const resolved = await resolveMobileScanForItemId(
        access.companyId,
        barcode,
        itemId,
        "fuzzy",
        Number.isFinite(confidence) ? confidence : 0.9,
      );
      await recordScanEvent({
        companyId: access.companyId,
        userId: access.uid,
        rawPayload: barcode,
        normalizedPayload: primaryScanCode(barcode),
        matchType: resolved.matchType,
        itemId,
        confidence: resolved.confidence,
        source: "manual",
        outcome,
      });
      return NextResponse.json({ ok: true, result: resolved });
    }

    await recordScanEvent({
      companyId: access.companyId,
      userId: access.uid,
      rawPayload: barcode,
      normalizedPayload: primaryScanCode(barcode),
      matchType: outcome === "created_mapping" ? "barcode_mapping" : null,
      itemId: itemId || null,
      confidence: Number.isFinite(confidence) ? confidence : 0,
      source: "manual",
      outcome,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof MobileAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[mobile/scan/feedback]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Не удалось сохранить отзыв" },
      { status: 500 },
    );
  }
}
