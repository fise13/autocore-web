import "server-only";

import {
  enqueueDocumentJob,
  fetchPendingEvents,
  fetchWorkOrder,
  markEventProcessed,
  processWorkOrderEvent,
} from "@/infrastructure/firestore/admin/work-order-effects-admin";
import type { DomainEvent } from "@/domain/domain-event";
import { loadDocumentContext } from "@/lib/documents/load-document-context";
import { resolveDocumentsFromPendingEvents } from "@/lib/documents/policy/document-policy";
import { emitNotificationsFromDomainEvents } from "@/lib/notifications/from-domain-event.server";

export type ProcessWorkOrderEventsResult = {
  processed: number;
  failed: number;
  jobId?: string;
  documentSlugs: string[];
};

export async function processWorkOrderEventsUseCase(params: {
  companyId: string;
  workOrderId: string;
  actorUserId: string;
}): Promise<ProcessWorkOrderEventsResult> {
  const order = await fetchWorkOrder(params.companyId, params.workOrderId);
  if (!order) {
    throw new Error("Work order not found");
  }

  const events = await fetchPendingEvents(params.companyId, params.workOrderId);
  if (events.length === 0) {
    return { processed: 0, failed: 0, documentSlugs: [] };
  }

  let processed = 0;
  let failed = 0;
  const processedEvents: DomainEvent[] = [];

  for (const event of events) {
    try {
      await processWorkOrderEvent(order, event, params.actorUserId);
      await markEventProcessed(params.companyId, event.id);
      processed += 1;
      processedEvents.push(event);
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : "Unknown error";
      await markEventProcessed(params.companyId, event.id, message);
    }
  }

  if (processedEvents.length > 0) {
    void emitNotificationsFromDomainEvents({
      events: processedEvents,
      actorUserId: params.actorUserId,
    }).catch((error) => {
      console.error("[process-work-order-events] notification emit failed", error);
    });
  }

  let context;
  try {
    context = await loadDocumentContext(params.companyId, params.workOrderId);
  } catch {
    context = undefined;
  }

  const documentSlugs = resolveDocumentsFromPendingEvents(events, order, context);
  let jobId: string | undefined;

  if (documentSlugs.length > 0) {
    jobId = await enqueueDocumentJob({
      companyId: params.companyId,
      aggregateType: "work_order",
      aggregateId: params.workOrderId,
      slugs: documentSlugs,
      triggerEventId: events[events.length - 1]?.id,
    });
  }

  return { processed, failed, jobId, documentSlugs };
}
