import { NextRequest, NextResponse } from "next/server";

import {
  InventoryEditAccessError,
  verifyInventoryEditAccess,
} from "@/lib/auth/verify-inventory-edit-access.server";
import {
  isRowPhotoEntityKind,
  uploadRowPhotoAdmin,
  validateRowPhotoFile,
} from "@/lib/grid/upload-row-photo.server";

export const runtime = "nodejs";
/** Photos can be several MB; keep headroom for Admin Storage upload. */
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const access = await verifyInventoryEditAccess(request);
    const formData = await request.formData();
    const entry = formData.get("file");
    const entityKindRaw = String(formData.get("entityKind") ?? "").trim();
    const entityId = String(formData.get("entityId") ?? "").trim();
    const companyIdRaw = String(formData.get("companyId") ?? "").trim();

    if (!(entry instanceof File)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }
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
      size: entry.size,
      type: entry.type,
      name: entry.name,
    });
    const buffer = Buffer.from(await entry.arrayBuffer());
    const result = await uploadRowPhotoAdmin({
      companyId: access.companyId,
      entityKind: entityKindRaw,
      entityId,
      buffer,
      contentType,
      extension,
    });

    return NextResponse.json({
      url: result.url,
      storagePath: result.storagePath,
    });
  } catch (error) {
    if (error instanceof InventoryEditAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[inventory/row-photo]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to upload photo" },
      { status: 500 },
    );
  }
}
