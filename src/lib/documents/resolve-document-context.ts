import "server-only";

import { DocumentContext } from "@/lib/documents/document-context";
import { polishDocumentContextForRender } from "@/lib/documents/ai/apply-document-label-polish";

export type DocumentAggregateType = "work_order" | "warranty" | "quote";

export async function resolveDocumentContext(
  companyId: string,
  aggregateId: string,
  aggregateType: DocumentAggregateType = "work_order",
): Promise<DocumentContext> {
  let context: DocumentContext;

  if (aggregateType === "warranty") {
    const { loadWarrantyDocumentContext } = await import("@/lib/documents/context/load-warranty-context");
    context = await loadWarrantyDocumentContext(companyId, aggregateId);
  } else if (aggregateType === "quote") {
    const { loadQuoteDocumentContext } = await import("@/lib/documents/context/load-quote-context");
    context = await loadQuoteDocumentContext(companyId, aggregateId);
  } else {
    const { loadDocumentContext } = await import("@/lib/documents/load-document-context");
    context = await loadDocumentContext(companyId, aggregateId);
  }

  return polishDocumentContextForRender(context);
}

export function parseDocumentAggregateType(value: string | null | undefined): DocumentAggregateType {
  if (value === "warranty" || value === "quote") return value;
  return "work_order";
}
