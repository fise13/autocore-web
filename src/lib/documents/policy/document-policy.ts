import { DomainEvent, DomainEventType } from "@/domain/domain-event";
import { WorkOrder } from "@/domain/work-order";
import { classifyServiceOrder } from "@/lib/documents/classify-service-order";
import { DocumentContext } from "@/lib/documents/document-context";
import { DocumentSlug } from "@/lib/documents/document-types";

export function resolveDocumentsForOrderCreated(): DocumentSlug[] {
  return ["work-order", "vehicle-intake-act"];
}

export function resolveDocumentsForOrderCompleted(context: DocumentContext): DocumentSlug[] {
  const profile = classifyServiceOrder(context);
  const slugs: DocumentSlug[] = ["service-act"];

  if (context.order.motorLines.length > 0) {
    slugs.push("engine-warranty");
    if (context.order.motorLines.some((line) => line.outcome === "sell")) {
      slugs.push("engine-waybill", "sales-receipt");
    }
  }

  if (profile.showOilInterval) {
    slugs.push("service-tag");
  }

  if (context.order.pricing.grandTotal > 0) {
    slugs.push("invoice");
  }

  return slugs;
}

export function resolveDocumentsForEvent(
  eventType: DomainEventType,
  order: WorkOrder,
  context?: DocumentContext,
): DocumentSlug[] {
  switch (eventType) {
    case "OrderCreated":
      return resolveDocumentsForOrderCreated();
    case "OrderCompleted":
    case "DocumentsGenerated":
      if (!context) return ["service-act"];
      return resolveDocumentsForOrderCompleted(context);
    case "WarrantyActivated":
      return ["engine-warranty"];
    case "QuoteCreated":
      return ["commercial-proposal" as DocumentSlug];
    default:
      return [];
  }
}

export function resolveDocumentsFromPendingEvents(
  events: DomainEvent[],
  order: WorkOrder,
  context?: DocumentContext,
): DocumentSlug[] {
  const slugs = new Set<DocumentSlug>();
  for (const event of events) {
    for (const slug of resolveDocumentsForEvent(event.type, order, context)) {
      slugs.add(slug);
    }
  }
  return Array.from(slugs);
}
