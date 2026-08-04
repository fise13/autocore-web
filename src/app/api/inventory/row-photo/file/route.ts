import { NextRequest, NextResponse } from "next/server";

import { resolveAdminStorageBucket } from "@/infrastructure/firebase/resolve-storage-bucket";
import {
  InventoryViewAccessError,
  verifyInventoryViewAccess,
} from "@/lib/auth/verify-inventory-view-access.server";
import { filenameFromMediaUrl, storagePathFromFirebaseMediaUrl } from "@/lib/grid/row-media-viewer";

export const runtime = "nodejs";
export const maxDuration = 60;

function contentTypeFromPath(path: string): string {
  const extension = path.split(".").pop()?.toLowerCase() ?? "";
  switch (extension) {
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    case "heic":
      return "image/heic";
    case "heif":
      return "image/heif";
    case "mp4":
      return "video/mp4";
    case "webm":
      return "video/webm";
    case "mov":
      return "video/quicktime";
    case "m4v":
      return "video/x-m4v";
    default:
      return "application/octet-stream";
  }
}

/**
 * Streams row media from Storage through the API so the browser can download
 * without hitting Firebase Storage CORS.
 */
export async function GET(request: NextRequest) {
  try {
    const access = await verifyInventoryViewAccess(request);
    const mediaUrl = request.nextUrl.searchParams.get("url")?.trim() ?? "";
    if (!mediaUrl) {
      return NextResponse.json({ error: "url is required" }, { status: 400 });
    }

    const storagePath = storagePathFromFirebaseMediaUrl(mediaUrl);
    if (!storagePath || !storagePath.startsWith(`companies/${access.companyId}/row-photos/`)) {
      return NextResponse.json({ error: "Invalid media URL" }, { status: 403 });
    }

    const bucket = await resolveAdminStorageBucket();
    const file = bucket.file(storagePath);
    const [exists] = await file.exists();
    if (!exists) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const [buffer] = await file.download();
    const [metadata] = await file.getMetadata();
    const contentType =
      (typeof metadata.contentType === "string" && metadata.contentType) ||
      contentTypeFromPath(storagePath);

    const asDownload = request.nextUrl.searchParams.get("download") === "1";
    const filenameParam = request.nextUrl.searchParams.get("filename")?.trim();
    const filename = filenameParam || filenameFromMediaUrl(mediaUrl, 0);
    const safeName = filename.replace(/[^\w.\-()+ ]+/g, "_") || "media";

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=300",
        ...(asDownload
          ? {
              "Content-Disposition": `attachment; filename="${safeName}"`,
            }
          : {
              "Content-Disposition": `inline; filename="${safeName}"`,
            }),
      },
    });
  } catch (error) {
    if (error instanceof InventoryViewAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[inventory/row-photo/file]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load media" },
      { status: 500 },
    );
  }
}
