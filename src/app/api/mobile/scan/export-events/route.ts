import { NextRequest, NextResponse } from "next/server";

import { MobileAccessError, verifyMobileAccess } from "@/lib/auth/verify-mobile-access.server";
import {
  aggregateScanMetrics,
  exportScanEvents,
} from "@/lib/mobile/scan-learning.server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const access = await verifyMobileAccess(request, "inventory_view");
    const limit = Number(request.nextUrl.searchParams.get("limit") ?? "5000");
    const sinceDays = Number(request.nextUrl.searchParams.get("sinceDays") ?? "7");

    const rows = await exportScanEvents(access.companyId, {
      limit: Number.isFinite(limit) ? limit : 5000,
      sinceDays: Number.isFinite(sinceDays) ? sinceDays : 7,
    });
    const metrics = aggregateScanMetrics(rows);

    return NextResponse.json({ rows, metrics });
  } catch (error) {
    if (error instanceof MobileAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[mobile/scan/export-events]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not export events" },
      { status: 500 },
    );
  }
}
