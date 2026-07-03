import { orderShowsOilIntervalTag } from '@/lib/documents/classify-service-order';
import type { DocumentSlug } from '@/types/document';
import type { WorkOrder } from '@/types/work-order';

export function resolveDocumentsForOrderCreated(): DocumentSlug[] {
  return ['work-order', 'vehicle-intake-act'];
}

export function resolveDocumentsForOrderCompleted(order: WorkOrder): DocumentSlug[] {
  const slugs: DocumentSlug[] = ['service-act'];

  if (order.motorLines.length > 0) {
    slugs.push('engine-warranty');
    if (order.motorLines.some((line) => line.outcome === 'sell')) {
      slugs.push('engine-waybill', 'sales-receipt');
    }
  }

  if (orderShowsOilIntervalTag(order)) {
    slugs.push('service-tag');
  }

  if (order.pricing.grandTotal > 0) {
    slugs.push('invoice');
  }

  return slugs;
}

export function resolveApplicableDocumentSlugs(order: WorkOrder): DocumentSlug[] {
  const { status } = order;

  if (status === 'draft' || status === 'confirmed' || status === 'in_progress' || status === 'waiting_parts') {
    return resolveDocumentsForOrderCreated();
  }

  if (status === 'completed' || status === 'delivered') {
    return resolveDocumentsForOrderCompleted(order);
  }

  return [];
}
