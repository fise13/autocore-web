import { NextRequest, NextResponse } from "next/server";

import { createDocumentImportJob } from "@/infrastructure/firestore/admin/document-import-admin";
import { MobileAccessError, verifyMobileAccess } from "@/lib/auth/verify-mobile-access.server";
import { emitNotificationEvent } from "@/lib/notifications/engine.server";

export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 12 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const access = await verifyMobileAccess(request, "inventory_view");
    const form = await request.formData();
    const file = form.get("image");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Загрузите изображение документа" }, { status: 400 });
    }

    if (file.size <= 0) {
      return NextResponse.json({ error: "Файл пустой" }, { status: 400 });
    }

    if (file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: "Изображение слишком большое (макс. 12 МБ)" }, { status: 400 });
    }

    const mimeType = file.type || "image/jpeg";
    if (!mimeType.startsWith("image/")) {
      return NextResponse.json({ error: "Поддерживаются только изображения" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const job = await createDocumentImportJob({
      companyId: access.companyId,
      createdBy: access.uid,
      buffer,
      contentType: mimeType,
      fileName: file.name || undefined,
    });

    void emitNotificationEvent({
      companyId: access.companyId,
      eventType: "document_import.created",
      actorUserId: access.uid,
      aggregateType: "document_import",
      aggregateId: job.id,
      payload: {
        fileName: job.fileName ?? "document",
      },
    }).catch((error) => console.warn("[mobile/imports] notification failed", error));

    return NextResponse.json({
      id: job.id,
      status: job.status,
      previewDownloadUrl: job.previewDownloadUrl,
      originalDownloadUrl: job.originalDownloadUrl,
      width: job.width,
      height: job.height,
      createdAt: job.createdAt.toISOString?.() ?? new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof MobileAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[mobile/imports]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Не удалось загрузить документ" },
      { status: 500 },
    );
  }
}
