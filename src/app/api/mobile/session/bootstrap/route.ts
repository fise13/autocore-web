import { NextResponse } from "next/server";

import { MobileAccessError } from "@/lib/auth/verify-mobile-access.server";
import { buildMobileSessionBootstrap } from "@/lib/mobile/session-bootstrap.server";
import { getAdminAuth } from "@/infrastructure/firebase/admin";

function readBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim() || null;
}

export async function GET(request: Request) {
  try {
    const token = readBearerToken(request);
    if (!token) {
      return NextResponse.json({ error: "Authorization required" }, { status: 401 });
    }

    const decoded = await getAdminAuth().verifyIdToken(token);
    if (!decoded.uid) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const payload = await buildMobileSessionBootstrap(decoded.uid);
    return NextResponse.json(payload);
  } catch (error) {
    if (error instanceof MobileAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[mobile/session/bootstrap]", error);
    return NextResponse.json({ error: "Could not load your session" }, { status: 500 });
  }
}
