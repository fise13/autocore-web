import { NextRequest, NextResponse } from "next/server";

import { UserRole } from "@/domain/user";
import { MobileAccessError, verifyMobileAccess } from "@/lib/auth/verify-mobile-access.server";
import { listMobileWorkOrders } from "@/lib/mobile/work-orders.server";
import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import { mapAdminUser } from "@/infrastructure/firestore/admin-mappers";

export const runtime = "nodejs";

const MINE_ONLY_ROLES = new Set<UserRole>(["mechanic", "diagnostician"]);

export async function GET(request: NextRequest) {
  try {
    const access = await verifyMobileAccess(request, "work_orders_view");
    const userSnap = await getAdminFirestore().collection("users").doc(access.uid).get();
    const user = mapAdminUser(access.uid, (userSnap.data() ?? {}) as Record<string, unknown>);
    const mineOnly =
      request.nextUrl.searchParams.get("mine") === "1" ||
      MINE_ONLY_ROLES.has(user.role);

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
