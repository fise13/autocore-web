import { NextRequest, NextResponse } from "next/server";

import {
  InventoryEditAccessError,
  verifyInventoryEditAccess,
} from "@/lib/auth/verify-inventory-edit-access.server";
import {
  isRowPhotoEntityKind,
  prepareRowMediaUpload,
  validateRowPhotoFile,
} from "@/lib/grid/upload-row-photo.server";

export const runtime = "nodejs";
export const maxDuration = 30;

/** Issues a signed Storage write URL so large photos/videos bypass the API body limit. */
export async function POST(request: NextRequest) {
  try {
    const access = await verifyInventoryEditAccess(request);
    const body = (await request.json()) as {
      entityKind?: string;
      entityId?: string;
      companyId?: string;
      fileName?: string;
      contentType?: string;
      size?: number;
    };

    const entityKindRaw = String(body.entityKind ?? "").trim();
    const entityId = String(body.entityId ?? "").trim();
    const companyIdRaw = String(body.companyId ?? "").trim();
    const fileName = String(body.fileName ?? "").trim();
    const contentTypeRaw = String(body.contentType ?? "").trim();
    const size = Number(body.size ?? 0);

    if (!isRowPhotoEntityKind(entityKindRaw)) {
      return NextResponse.json({ error: "entityKind is invalid" }, { status: 400 });
    }
    if (!entityId) {
      return NextResponse.json({ error: "entityId is required" }, { status: 400 });
    }
    if (companyIdRaw && companyIdRaw !== access.companyId) {
      return NextResponse.json({ error: "Company mismatch" }, { status: 403 });
    }

    const { extension, contentType } = validateRowPhotoFile({
      size,
      type: contentTypeRaw,
      name: fileName,
    });

    const prepared = await prepareRowMediaUpload({
      companyId: access.companyId,
      entityKind: entityKindRaw,
      entityId,
      contentType,
      extension,
    });

    return NextResponse.json({
      uploadUrl: prepared.uploadUrl,
      storagePath: prepared.storagePath,
      downloadToken: prepared.downloadToken,
      url: prepared.url,
      contentType,
    });
  } catch (error) {
    if (error instanceof InventoryEditAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[inventory/row-photo/prepare]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to prepare upload" },
      { status: 500 },
    );
  }
}
