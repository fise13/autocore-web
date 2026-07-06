import { NextRequest, NextResponse } from "next/server";

import { MobileAccessError, verifyMobileAccess } from "@/lib/auth/verify-mobile-access.server";
import { listMobileWorkOrders } from "@/lib/mobile/work-orders.server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const access = await verifyMobileAccess(request, "work_orders_view");
    const mineOnly =
      request.nextUrl.searchParams.get("mine") === "1" ||
      access.scopes.workOrders === "assigned_work_orders";

    const orders = await listMobileWorkOrders({
      companyId: access.companyId,
      uid: access.uid,
      mineOnly,
    });

    return NextResponse.json({ orders });
  } catch (error) {
    if (error instanceof MobileAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[mobile/work-orders]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Не удалось загрузить наряды" },
      { status: 500 },
    );
  }
}
