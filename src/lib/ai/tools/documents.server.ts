import "server-only";

import { hasPermission } from "@autocore/rbac";

import { toolFailure, type CoreToolContext } from "@/lib/ai/tools/context";
import { readCompanyProActive } from "@/lib/billing/verify-pro-subscription.server";
import { ensureWorkOrderDocumentsScheduled } from "@/lib/documents/ensure-work-order-documents";
import { getAppUrl } from "@/lib/site-urls";

export async function ensureWorkOrderDocuments(
  ctx: CoreToolContext,
  input: { workOrderId: string },
) {
  if (!hasPermission(ctx.profile, "work_orders_view")) {
    return toolFailure("You do not have access to work-order documents.");
  }
  if (!(await readCompanyProActive(ctx.companyId))) {
    return toolFailure("Document generation requires an active Pro subscription.");
  }

  const result = await ensureWorkOrderDocumentsScheduled({
    companyId: ctx.companyId,
    workOrderId: input.workOrderId.trim(),
    origin: getAppUrl(),
  });

  return {
    ok: true as const,
    workOrderId: input.workOrderId.trim(),
    jobId: result.jobId,
    slugs: result.slugs,
    href: `/work-orders?order=${encodeURIComponent(input.workOrderId.trim())}`,
  };
}
