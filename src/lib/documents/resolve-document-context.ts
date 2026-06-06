import "server-only";

import { DocumentContext } from "@/lib/documents/document-context";

export type DocumentAggregateType = "work_order" | "warranty" | "quote";

export async function resolveDocumentContext(
  companyId: string,
  aggregateId: string,
  aggregateType: DocumentAggregateType = "work_order",
): Promise<DocumentContext> {
  if (aggregateType === "warranty") {
    const { loadWarrantyDocumentContext } = await import("@/lib/documents/context/load-warranty-context");
    return loadWarrantyDocumentContext(companyId, aggregateId);
  }

  if (aggregateType === "quote") {
    const { loadQuoteDocumentContext } = await import("@/lib/documents/context/load-quote-context");
    return loadQuoteDocumentContext(companyId, aggregateId);
  }

  const { loadDocumentContext } = await import("@/lib/documents/load-document-context");
  return loadDocumentContext(companyId, aggregateId);
}

export function parseDocumentAggregateType(value: string | null | undefined): DocumentAggregateType {
  if (value === "warranty" || value === "quote") return value;
  return "work_order";
}
