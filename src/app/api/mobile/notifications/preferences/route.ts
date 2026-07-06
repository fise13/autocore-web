import { NextRequest, NextResponse } from "next/server";

import type { NotificationPreferences } from "@/domain/notifications";
import { AccountAccessError, verifyAccountAccess } from "@/lib/auth/verify-account-access";
import {
  readNotificationPreferences,
  writeNotificationPreferences,
} from "@/infrastructure/firestore/notification-repository.server";
import { mergeNotificationPreferences } from "@/lib/notifications/preference-resolver";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const access = await verifyAccountAccess(request);
    const preferences = await readNotificationPreferences(access.uid);
    return NextResponse.json({ preferences });
  } catch (error) {
    if (error instanceof AccountAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[mobile/notifications/preferences GET]", error);
    return NextResponse.json({ error: "Не удалось загрузить настройки" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const access = await verifyAccountAccess(request);
    const body = (await request.json()) as Partial<NotificationPreferences>;
    const current = await readNotificationPreferences(access.uid);
    const next = mergeNotificationPreferences({
      ...current,
      ...body,
      channels: { ...current.channels, ...body.channels },
      categories: { ...current.categories, ...body.categories },
      quietHours: { ...current.quietHours, ...body.quietHours },
    });

    await writeNotificationPreferences(access.uid, next);
    return NextResponse.json({ preferences: next });
  } catch (error) {
    if (error instanceof AccountAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[mobile/notifications/preferences PATCH]", error);
    return NextResponse.json({ error: "Не удалось сохранить настройки" }, { status: 500 });
  }
}
