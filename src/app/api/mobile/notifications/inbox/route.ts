import { NextRequest, NextResponse } from "next/server";

import { MobileAccessError, verifyMobileAccess } from "@/lib/auth/verify-mobile-access.server";
import {
  countUnreadNotifications,
  listInboxNotifications,
} from "@/infrastructure/firestore/notification-repository.server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const access = await verifyMobileAccess(request);
    const state = request.nextUrl.searchParams.get("state") as
      | "unread"
      | "read"
      | "archived"
      | "dismissed"
      | "active"
      | null;

    const [items, unreadCount] = await Promise.all([
      listInboxNotifications({
        userId: access.uid,
        companyId: access.companyId,
        state: state ?? "active",
      }),
      countUnreadNotifications(access.uid, access.companyId),
    ]);

    return NextResponse.json({ items, unreadCount });
  } catch (error) {
    if (error instanceof MobileAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[mobile/notifications/inbox]", error);
    return NextResponse.json({ error: "Could not load notifications" }, { status: 500 });
  }
}
