import { NextRequest, NextResponse } from "next/server";

import { MobileAccessError, verifyMobileAccess } from "@/lib/auth/verify-mobile-access.server";
import { recordScanEvent } from "@/lib/mobile/scan-events.server";
import { ocrAndResolveMobileScan } from "@/lib/mobile/scan-ocr.server";
import { primaryScanCode } from "@/lib/mobile/scan-normalize";

export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const access = await verifyMobileAccess(request, "inventory_view");
    const form = await request.formData();
    const file = form.get("image");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Загрузите изображение" }, { status: 400 });
    }

    if (file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: "Изображение слишком большое (макс. 6 МБ)" }, { status: 400 });
    }

    const mimeType = file.type || "image/jpeg";
    if (!mimeType.startsWith("image/")) {
      return NextResponse.json({ error: "Поддерживаются только изображения" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const imageBase64 = buffer.toString("base64");
    const result = await ocrAndResolveMobileScan(access.companyId, imageBase64, mimeType);

    const resolved = result.resolve;
    void recordScanEvent({
      companyId: access.companyId,
      userId: access.uid,
      rawPayload: result.extractedCodes[0] ?? "photo",
      normalizedPayload: primaryScanCode(result.extractedCodes[0] ?? ""),
      matchType: resolved?.matchType ?? null,
      itemId: resolved?.item?.id ?? null,
      confidence: resolved?.confidence ?? result.ocr.confidence,
      source: "photo",
      outcome: resolved?.found ? "auto_accept" : "unknown",
    }).catch((error) => console.warn("[scan/ocr] event log failed", error));

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof MobileAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[mobile/scan/ocr]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Не удалось распознать фото" },
      { status: 500 },
    );
  }
}
