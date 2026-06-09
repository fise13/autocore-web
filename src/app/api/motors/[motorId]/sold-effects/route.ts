import { NextRequest, NextResponse } from "next/server";

import { processStandaloneMotorSold } from "@/infrastructure/firestore/admin/motor-sold-effects-admin";
import {
  DocumentAccessError,
  verifyDocumentAccess,
} from "@/lib/documents/verify-document-access";
import { mapServerError } from "@/lib/errors/map-server-error";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ motorId: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const access = await verifyDocumentAccess(request);
    const { motorId } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;

    const result = await processStandaloneMotorSold({
      companyId: access.companyId,
      actorUserId: access.uid,
      motor: {
        id: motorId.trim(),
        serialCode: String(body.serialCode ?? motorId),
        engineCode: typeof body.engineCode === "string" ? body.engineCode : undefined,
        brandName: typeof body.brandName === "string" ? body.brandName : undefined,
        configuration: typeof body.configuration === "string" ? body.configuration : "",
        localId: body.localId == null ? undefined : Number(body.localId),
      },
      amount: Number(body.amount ?? 0),
      account: String(body.account ?? "cashbox"),
      paymentMethod: String(body.paymentMethod ?? "cash"),
      comment: typeof body.comment === "string" ? body.comment : undefined,
    });

    void fetch(`${request.nextUrl.origin}/api/documents/process-queue`, {
      method: "POST",
      headers: {
        Authorization: request.headers.get("authorization") ?? "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ jobId: result.jobId }),
    }).catch(() => undefined);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof DocumentAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[motors/sold-effects]", error);
    return NextResponse.json(
      { error: mapServerError(error, "Не удалось оформить продажу мотора") },
      { status: 500 },
    );
  }
}
