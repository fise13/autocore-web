import { NextRequest, NextResponse } from "next/server";

import { expireStaleImportBatches } from "@/lib/import-batch/expire-import-batches.server";

export const runtime = "nodejs";

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return process.env.NODE_ENV === "development";
  return request.headers.get("x-cron-secret") === secret;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await expireStaleImportBatches();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[cron/import-batches/expire]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Expire failed" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
