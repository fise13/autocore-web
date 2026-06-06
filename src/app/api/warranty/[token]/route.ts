import { NextRequest, NextResponse } from "next/server";

import { findCompanyName, findWarrantyByToken } from "@/lib/warranty/verify-warranty.server";

type RouteContext = {
  params: Promise<{ token: string }>;
};

export const runtime = "nodejs";

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { token } = await context.params;
    const trimmed = token?.trim();
    if (!trimmed) {
      return NextResponse.json({ error: "Token required" }, { status: 400 });
    }

    const warranty = await findWarrantyByToken(trimmed);
    if (!warranty) {
      return NextResponse.json({ error: "Warranty not found" }, { status: 404 });
    }

    const companyName = await findCompanyName(warranty.companyId);
    const now = new Date();
    const isExpired = warranty.status === "expired" || warranty.expiresAt.getTime() < now.getTime();

    return NextResponse.json({
      companyName,
      serialCode: warranty.serialCode,
      engineCode: warranty.engineCode,
      vin: warranty.vin,
      licensePlate: warranty.licensePlate,
      installedAt: warranty.installedAt.toISOString(),
      expiresAt: warranty.expiresAt.toISOString(),
      expiresAtMileage: warranty.expiresAtMileage,
      status: isExpired ? "expired" : warranty.status,
    });
  } catch (error) {
    console.error("[warranty/verify]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Verification failed" },
      { status: 500 },
    );
  }
}
