import { headers } from "next/headers";
import { NextResponse } from "next/server";

import {
  buildAppleAppSiteAssociation,
  universalLinkHostKind,
} from "@/lib/mobile/universal-links";

/**
 * iOS Universal Links.
 *
 * Served from the app route tree rather than `public/` so both public origins
 * get the file with no redirect and no auth: `middleware.ts` excludes
 * `.well-known` from its matcher, so nothing rewrites or gates this path.
 *
 * The body is host-dependent — the marketing origin must not claim `/` — so the
 * response is rendered per request instead of statically.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const hostKind = universalLinkHostKind((await headers()).get("host"));
  const body = JSON.stringify(buildAppleAppSiteAssociation(hostKind));

  return new NextResponse(body, {
    headers: {
      // Apple requires `application/json` and no redirect on this path.
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
      Vary: "Host",
    },
  });
}
