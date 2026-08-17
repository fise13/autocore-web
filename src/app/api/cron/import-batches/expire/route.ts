import { NextRequest, NextResponse } from "next/server";

import { authorizeCron } from "@/lib/cron/authorize-cron";
import { expireStaleImportBatches } from "@/lib/import-batch/expire-import-batches.server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!authorizeCron(request)) {
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
