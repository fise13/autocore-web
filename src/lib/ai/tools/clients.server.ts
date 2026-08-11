import "server-only";

import { hasPermission } from "@autocore/rbac";

import { adminCreateClient } from "@/infrastructure/firestore/admin/core-ops-admin";
import { toolFailure, type CoreToolContext } from "@/lib/ai/tools/context";

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
