import { NextRequest, NextResponse } from "next/server";

import {
  DesktopAccessError,
  verifyDesktopAccess,
} from "@/lib/auth/verify-desktop-access.server";
import { buildListingDraft } from "@/lib/desktop/build-listing-draft.server";
import { ListingPlatform } from "@/lib/desktop/listing-draft";

export const runtime = "nodejs";

function parsePlatform(value: string | null): ListingPlatform | null {
  if (value === "kolesa" || value === "olx") return value;
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const access = await verifyDesktopAccess(request, "inventory_view");
    const motorId = request.nextUrl.searchParams.get("motorId")?.trim();
    const platform = parsePlatform(request.nextUrl.searchParams.get("platform"));

    if (!motorId) {
      return NextResponse.json({ error: "Укажите motorId" }, { status: 400 });
    }
    if (!platform) {
      return NextResponse.json({ error: "Укажите platform=kolesa|olx" }, { status: 400 });
    }

    const draft = await buildListingDraft({
      companyId: access.companyId,
      motorId,
      platform,
    });

    return NextResponse.json(draft);
  } catch (error) {
    if (error instanceof DesktopAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[desktop/listings/draft]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Не удалось собрать черновик" },
      { status: 500 },
    );
  }
}
