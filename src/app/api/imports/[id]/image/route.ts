import { NextRequest, NextResponse } from "next/server";

import { getDocumentImportJobAdmin } from "@/infrastructure/firestore/admin/document-import-admin";
import { resolveAdminStorageBucket } from "@/infrastructure/firebase/resolve-storage-bucket";
import {
  InventoryViewAccessError,
  verifyInventoryViewAccess,
} from "@/lib/auth/verify-inventory-view-access.server";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Serve document-import image bytes via API (avoids broken Storage token / CORS in viewer).
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const access = await verifyInventoryViewAccess(request);
    const { id } = await context.params;
    const job = await getDocumentImportJobAdmin(access.companyId, id);
    if (!job) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const preferPreview = new URL(request.url).searchParams.get("preview") !== "0";
    const storagePath =
      (preferPreview && job.previewStoragePath) || job.originalStoragePath || null;
    if (!storagePath) {
      return NextResponse.json({ error: "No file" }, { status: 404 });
    }

    const bucket = await resolveAdminStorageBucket();
    const [buffer] = await bucket.file(storagePath).download();
    const contentType =
      preferPreview && job.previewStoragePath
        ? "image/webp"
        : job.contentType || "application/octet-stream";

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (error) {
    if (error instanceof InventoryViewAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[api/imports/image]", error);
    return NextResponse.json({ error: "Failed to load image" }, { status: 500 });
  }
}
