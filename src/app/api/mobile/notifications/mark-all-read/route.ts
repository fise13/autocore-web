import { NextRequest, NextResponse } from "next/server";

import { MobileAccessError, verifyMobileAccess } from "@/lib/auth/verify-mobile-access.server";
import { markAllNotificationsRead } from "@/infrastructure/firestore/notification-repository.server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const access = await verifyMobileAccess(request);
    const updated = await markAllNotificationsRead(access.uid, access.companyId);
    return NextResponse.json({ updated });
  } catch (error) {
    if (error instanceof MobileAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[mobile/notifications/mark-all-read]", error);
    return NextResponse.json({ error: "Не удалось отметить уведомления" }, { status: 500 });
  }
}
