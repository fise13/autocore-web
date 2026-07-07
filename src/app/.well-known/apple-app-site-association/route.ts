import { NextResponse } from "next/server";

import { buildAppleAppSiteAssociation } from "@/lib/mobile/universal-links";

/** iOS Universal Links — invite/join URLs open AutoCore Mobile instead of Safari. */
export function GET() {
  const body = JSON.stringify(buildAppleAppSiteAssociation());

  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
