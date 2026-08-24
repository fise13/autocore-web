import { NextRequest, NextResponse } from "next/server";

import {
  addFileToImportBatchAdmin,
  ensureOpenImportBatchAdmin,
} from "@/infrastructure/firestore/admin/import-batch-admin";
import { MobileAccessError, verifyMobileAccess } from "@/lib/auth/verify-mobile-access.server";
import { kickImportBatchProcessing } from "@/lib/import-batch/kick-import-batch.server";
import { emitNotificationEvent } from "@/lib/notifications/engine.server";

export const runtime = "nodejs";

const MAX_BYTES = 25 * 1024 * 1024;

const ALLOWED_PREFIXES = ["image/", "application/pdf", "text/csv", "text/plain"];
const ALLOWED_EXACT = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/pdf",
]);

function isAllowedMime(mime: string, fileName?: string): boolean {
  const normalized = mime.toLowerCase();
  if (ALLOWED_EXACT.has(normalized)) return true;
  if (ALLOWED_PREFIXES.some((p) => normalized.startsWith(p))) return true;
  const name = (fileName ?? "").toLowerCase();
  return /\.(jpe?g|png|webp|heic|heif|pdf|xlsx|xls|csv)$/.test(name);
}

export async function POST(request: NextRequest) {
  try {
    const access = await verifyMobileAccess(request, "inventory_view");
    const form = await request.formData();
    const file =
      form.get("file") instanceof File
        ? (form.get("file") as File)
        : form.get("image") instanceof File
          ? (form.get("image") as File)
          : null;

    if (!file) {
      return NextResponse.json({ error: "Attach a file" }, { status: 400 });
    }

    if (file.size <= 0) {
      return NextResponse.json({ error: "The file is empty" }, { status: 400 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File is too large (max 25 MB)" }, { status: 400 });
    }

    const mimeType = file.type || "image/jpeg";
    if (!isAllowedMime(mimeType, file.name)) {
      return NextResponse.json(
        { error: "Supported formats: photo, PDF, Excel, CSV" },
        { status: 400 },
      );
    }

    const requestedBatchId = String(form.get("batchId") ?? "").trim() || null;
    const batch = await ensureOpenImportBatchAdmin({
      companyId: access.companyId,
      createdBy: access.uid,
      batchId: requestedBatchId,
      target: "motors",
    });

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await addFileToImportBatchAdmin({
      companyId: access.companyId,
      batchId: batch.id,
      buffer,
      contentType: mimeType,
      fileName: file.name || undefined,
    });

    void kickImportBatchProcessing({
      companyId: access.companyId,
      batchId: batch.id,
      fileId: result.file.id,
    }).catch((error) => console.warn("[mobile/imports] kick failed", error));

    void emitNotificationEvent({
      companyId: access.companyId,
      eventType: "document_import.created",
      actorUserId: access.uid,
      aggregateType: "document_import",
      aggregateId: batch.id,
      payload: {
        fileName: result.file.fileName ?? "import",
        batchId: batch.id,
      },
    }).catch((error) => console.warn("[mobile/imports] notification failed", error));

    return NextResponse.json({
      id: batch.id,
      batchId: batch.id,
      fileId: result.file.id,
      status: result.file.status,
      previewDownloadUrl: result.file.previewDownloadUrl,
      originalDownloadUrl: result.file.downloadUrl,
      width: result.file.width,
      height: result.file.height,
      createdAt: result.file.createdAt.toISOString?.() ?? new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof MobileAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[mobile/imports]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load the document" },
      { status: 500 },
    );
  }
}
