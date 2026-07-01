import { NextRequest, NextResponse } from "next/server";

import { MobileAccessError, verifyMobileAccess } from "@/lib/auth/verify-mobile-access.server";
import { getMobileWorkOrderDetail } from "@/lib/mobile/work-orders.server";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ orderId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const access = await verifyMobileAccess(request, "work_orders_view");
    const { orderId } = await context.params;
    const trimmed = orderId?.trim();
    if (!trimmed) {
      return NextResponse.json({ error: "orderId is required" }, { status: 400 });
    }

    const order = await getMobileWorkOrderDetail({
      companyId: access.companyId,
      workOrderId: trimmed,
      uid: access.uid,
    });

    if (!order) {
      return NextResponse.json({ error: "Заказ-наряд не найден" }, { status: 404 });
    }

    return NextResponse.json({ order });
  } catch (error) {
    if (error instanceof MobileAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[mobile/work-orders/[orderId]]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Не удалось загрузить наряд" },
      { status: 500 },
    );
  }
}
