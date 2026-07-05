import { NextRequest, NextResponse } from "next/server";

import { MobileAccessError, verifyMobileAccess } from "@/lib/auth/verify-mobile-access.server";
import {
  markAllNotificationsRead,
  updateNotificationState,
} from "@/infrastructure/firestore/notification-repository.server";

export const runtime = "nodejs";

type PatchBody = {
  state: "read" | "archived" | "dismissed";
};

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ notificationId: string }> },
) {
  try {
    const access = await verifyMobileAccess(request);
    const { notificationId } = await context.params;
    const body = (await request.json()) as PatchBody;

    if (!body.state) {
      return NextResponse.json({ error: "state обязателен" }, { status: 400 });
    }

    await updateNotificationState({
      notificationId,
      userId: access.uid,
      state: body.state,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof MobileAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[mobile/notifications/[id]]", error);
    return NextResponse.json({ error: "Не удалось обновить уведомление" }, { status: 500 });
  }
}
