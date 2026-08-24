import { NextRequest, NextResponse } from "next/server";

import { loadMarketplaceFeedAdmin } from "@/infrastructure/firestore/admin/marketplace-feed-admin";
import {
  adsForChannel,
  buildAvitoXml,
  buildDromXml,
} from "@/lib/dismantler/build-marketplace-feed";
import type { MarketplaceChannel } from "@/domain/marketplace-listing";

export const runtime = "nodejs";

function isChannel(value: string): value is MarketplaceChannel {
  return value === "avito" || value === "drom";
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ channel: string }> },
) {
  const { channel: rawChannel } = await context.params;
  const channel = rawChannel.trim().toLowerCase();
  if (!isChannel(channel)) {
    return NextResponse.json({ error: "Unknown channel" }, { status: 404 });
  }

  const companyId = request.nextUrl.searchParams.get("companyId")?.trim() ?? "";
  const token = request.nextUrl.searchParams.get("token")?.trim() ?? "";
  if (!companyId || !token) {
    return NextResponse.json({ error: "Missing companyId or token" }, { status: 400 });
  }

  const feed = await loadMarketplaceFeedAdmin(companyId);
  if (!feed.settings.feedToken || feed.settings.feedToken !== token) {
    return NextResponse.json({ error: "Invalid feed token" }, { status: 403 });
  }

  if (channel === "avito" && !feed.settings.avitoEnabled) {
    return NextResponse.json({ error: "Avito feed is disabled" }, { status: 404 });
  }
  if (channel === "drom" && !feed.settings.dromEnabled) {
    return NextResponse.json({ error: "Drom feed is disabled" }, { status: 404 });
  }

  const ads = adsForChannel({
    channel,
    listings: feed.listings,
    parts: feed.parts,
    donors: feed.donors,
  });
  const xml = channel === "avito" ? buildAvitoXml(ads) : buildDromXml(ads);

  return new NextResponse(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
