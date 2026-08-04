import { NextRequest, NextResponse } from "next/server";

import {
  InventoryEditAccessError,
  verifyInventoryEditAccess,
} from "@/lib/auth/verify-inventory-edit-access.server";
import { finalizeRowMediaUpload } from "@/lib/grid/upload-row-photo.server";

export const runtime = "nodejs";
export const maxDuration = 30;

/** Confirms download-token metadata after a direct Storage PUT. */
export async function POST(request: NextRequest) {
  try {
    const access = await verifyInventoryEditAccess(request);
    const body = (await request.json()) as {
      companyId?: string;
      storagePath?: string;
      downloadToken?: string;
      contentType?: string;
    };

    const companyIdRaw = String(body.companyId ?? "").trim();
    const storagePath = String(body.storagePath ?? "").trim();
    const downloadToken = String(body.downloadToken ?? "").trim();
    const contentType = String(body.contentType ?? "").trim();

    if (companyIdRaw && companyIdRaw !== access.companyId) {
      return NextResponse.json({ error: "Company mismatch" }, { status: 403 });
    }
    if (!storagePath || !downloadToken || !contentType) {
      return NextResponse.json({ error: "storagePath, downloadToken, and contentType are required" }, { status: 400 });
    }

    const result = await finalizeRowMediaUpload({
      companyId: access.companyId,
      storagePath,
      downloadToken,
      contentType,
    });

    return NextResponse.json({ url: result.url });
  } catch (error) {
    if (error instanceof InventoryEditAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[inventory/row-photo/finalize]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to finalize upload" },
      { status: 500 },
    );
  }
}
