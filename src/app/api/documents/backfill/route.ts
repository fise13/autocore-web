import { NextRequest, NextResponse } from "next/server";

import { ensureWorkOrderDocumentsScheduled } from "@/lib/documents/ensure-work-order-documents";
import { DocumentAccessError, verifyDocumentAccess } from "@/lib/documents/verify-document-access";
import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import { normalizeCompanyId } from "@/lib/company-id";
import { mapAdminWorkOrder } from "@/infrastructure/firestore/admin-mappers";

export const runtime = "nodejs";
export const maxDuration = 60;

type BackfillBody = {
  limit?: number;
};

export async function POST(request: NextRequest) {
  try {
    const access = await verifyDocumentAccess(request);
    const body = (await request.json().catch(() => ({}))) as BackfillBody;
    const limit = Math.min(Math.max(Number(body.limit ?? 20), 1), 100);

    const db = getAdminFirestore();
    const ordersSnap = await db
      .collection("companies")
      .doc(normalizeCompanyId(access.companyId))
      .collection("workOrders")
      .where("status", "in", ["completed", "delivered", "confirmed", "in_progress"])
      .limit(limit * 3)
      .get();

    const orders = ordersSnap.docs
      .map((doc) => mapAdminWorkOrder(doc.id, doc.data() as Record<string, unknown>))
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, limit);

    const scheduled: Array<{ workOrderId: string; jobId?: string; slugs: string[] }> = [];

    for (const order of orders) {
      const result = await ensureWorkOrderDocumentsScheduled({
        companyId: access.companyId,
        workOrderId: order.id,
        origin: request.nextUrl.origin,
        authorization: request.headers.get("authorization"),
      });
      if (result.slugs.length > 0) {
        scheduled.push({ workOrderId: order.id, jobId: result.jobId, slugs: result.slugs });
      }
    }

    return NextResponse.json({
      scanned: orders.length,
      scheduled: scheduled.length,
      jobs: scheduled,
    });
  } catch (error) {
    if (error instanceof DocumentAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[documents/backfill]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to backfill documents" },
      { status: 500 },
    );
  }
}
