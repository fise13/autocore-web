import "server-only";

import { hasPermission } from "@autocore/rbac";

import { uniqueClientsFromRecentOrders } from "@/domain/ai/recent-clients";
import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import { adminCreateClient } from "@/infrastructure/firestore/admin/core-ops-admin";
import { toolFailure, type CoreToolContext } from "@/lib/ai/tools/context";
import { normalizeCompanyId } from "@/lib/company-id";
import { listMobileWorkOrders } from "@/lib/mobile/work-orders.server";

export async function createClient(
  ctx: CoreToolContext,
  input: { fullName: string; phone: string; email?: string; notes?: string },
) {
  if (!hasPermission(ctx.profile, "clients_manage")) {
    return toolFailure("Your role cannot create customers.");
  }

  const client = await adminCreateClient({
    companyId: ctx.companyId,
    fullName: input.fullName.trim(),
    phone: input.phone.trim(),
    email: input.email?.trim() || "",
    notes: input.notes?.trim(),
    createdByUserId: ctx.uid,
  });

  return {
    ok: true as const,
    clientId: client.id,
    fullName: client.fullName,
    phone: client.phone,
    href: "/work-orders",
  };
}

export async function searchClients(
  ctx: CoreToolContext,
  input: { query?: string; limit: number },
) {
  if (
    !hasPermission(ctx.profile, "clients_manage") &&
    ctx.scopes.workOrders === "none"
  ) {
    return toolFailure("You do not have access to customers in this company.");
  }

  const needle = input.query?.trim().toLowerCase() ?? "";
  const href = "/work-orders";
  const fromOrders =
    ctx.scopes.workOrders === "none"
      ? []
      : await listMobileWorkOrders({
          companyId: ctx.companyId,
          uid: ctx.uid,
          mineOnly: ctx.scopes.workOrders === "assigned_work_orders",
          includeClosed: true,
        });

  const fromJobs = uniqueClientsFromRecentOrders(fromOrders);
  type Row = {
    id: string;
    fullName: string;
    phone: string;
    lastWorkOrderId?: string;
    lastWorkOrderNumber?: string;
    href: string;
  };

  const seen = new Set<string>();
  const rows: Row[] = [];

  const push = (row: Row) => {
    const key = row.id.toLowerCase();
    if (seen.has(key)) return;
    const haystack = `${row.fullName} ${row.phone}`.toLowerCase();
    if (needle && !haystack.includes(needle)) return;
    seen.add(key);
    rows.push(row);
  };

  for (const client of fromJobs) {
    push({
      ...client,
      href: `/work-orders?order=${encodeURIComponent(client.lastWorkOrderId)}`,
    });
  }

  if (hasPermission(ctx.profile, "clients_manage")) {
    const db = getAdminFirestore();
    const col = db
      .collection("companies")
      .doc(normalizeCompanyId(ctx.companyId))
      .collection("clients");
    let snap;
    try {
      snap = await col.orderBy("updatedAt", "desc").limit(80).get();
    } catch {
      snap = await col.limit(80).get();
    }

    for (const doc of snap.docs) {
      const data = doc.data() as Record<string, unknown>;
      const fullName = String(data.fullName ?? "").trim();
      const phone = String(data.phone ?? "").trim();
      if (!fullName) continue;
      const last = fromJobs.find(
        (row) =>
          row.id.toLowerCase() === doc.id.toLowerCase() ||
          row.fullName.toLowerCase() === fullName.toLowerCase(),
      );
      push({
        id: doc.id,
        fullName,
        phone,
        lastWorkOrderId: last?.lastWorkOrderId,
        lastWorkOrderNumber: last?.lastWorkOrderNumber,
        href: last?.lastWorkOrderId
          ? `/work-orders?order=${encodeURIComponent(last.lastWorkOrderId)}`
          : href,
      });
    }
  }

  return {
    ok: true as const,
    clients: rows.slice(0, input.limit),
    totalMatched: rows.length,
    href,
  };
}
