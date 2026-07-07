import { NextRequest, NextResponse } from "next/server";

import { MobileAccessError, verifyMobileAuth } from "@/lib/auth/verify-mobile-access.server";
import { upsertNotificationDevice } from "@/infrastructure/firestore/notification-repository.server";

export const runtime = "nodejs";

type RegisterDeviceBody = {
  deviceId: string;
  platform: "ios" | "android" | "web";
  pushToken: string;
  appVersion?: string;
};

export async function POST(request: NextRequest) {
  try {
    const access = await verifyMobileAuth(request);
    const body = (await request.json()) as RegisterDeviceBody;

    if (!body.deviceId?.trim() || !body.pushToken?.trim() || !body.platform) {
      return NextResponse.json({ error: "Некорректные данные устройства" }, { status: 400 });
    }

    await upsertNotificationDevice(access.uid, {
      id: body.deviceId.trim(),
      platform: body.platform,
      pushToken: body.pushToken.trim(),
      appVersion: body.appVersion,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof MobileAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[mobile/notifications/register-device]", error);
    return NextResponse.json({ error: "Не удалось зарегистрировать устройство" }, { status: 500 });
  }
}
