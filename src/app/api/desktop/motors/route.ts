import { NextRequest, NextResponse } from "next/server";

import {
  DesktopAccessError,
  verifyDesktopAccess,
} from "@/lib/auth/verify-desktop-access.server";
import { listMotorDocuments } from "@/lib/desktop/fetch-motor.server";
import { formatMotorDisplayName } from "@/lib/motors/format-motor-display-name";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const access = await verifyDesktopAccess(request, "inventory_view");
    const status = request.nextUrl.searchParams.get("status")?.trim() || "available";
    const documents = await listMotorDocuments(access.companyId, status);

    const motors = documents.map(({ motor }) => ({
      id: motor.id,
      label: formatMotorDisplayName(motor) || motor.serialCode || motor.id,
      status: motor.status,
      serialCode: motor.serialCode,
    }));

    return NextResponse.json({ motors });
  } catch (error) {
    if (error instanceof DesktopAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[desktop/motors]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Не удалось загрузить моторы" },
      { status: 500 },
    );
  }
}
