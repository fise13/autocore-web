import { DocumentContext } from "@/lib/documents/document-context";
import { classifyServiceOrder } from "@/lib/documents/classify-service-order";
import { DocumentSlug } from "@/lib/documents/document-types";

export type DocumentSection =
  | { type: "client_vehicle" }
  | { type: "labor_table" }
  | { type: "parts_table" }
  | { type: "engine_block" }
  | { type: "warranty" }
  | { type: "oil_interval" }
  | { type: "diagnostics" }
  | { type: "break_in" }
  | { type: "totals" }
  | { type: "signatures" }
  | { type: "qr" };

export function buildDocumentSections(slug: DocumentSlug, context: DocumentContext): DocumentSection[] {
  const profile = classifyServiceOrder(context);
  const sections: DocumentSection[] = [{ type: "client_vehicle" }];

  switch (slug) {
    case "work-order":
      if (context.order.laborLines.length > 0) sections.push({ type: "labor_table" });
      if (context.order.partLines.length > 0) sections.push({ type: "parts_table" });
      if (context.order.motorLines.length > 0) sections.push({ type: "engine_block" });
      if (profile.showDiagnosticsNotes) sections.push({ type: "diagnostics" });
      if (profile.showBreakInNotes) sections.push({ type: "break_in" });
      sections.push({ type: "totals" }, { type: "signatures" });
      break;
    case "service-act":
      if (context.order.laborLines.length > 0) sections.push({ type: "labor_table" });
      if (context.order.partLines.length > 0) sections.push({ type: "parts_table" });
      if (context.order.motorLines.length > 0) sections.push({ type: "engine_block" });
      sections.push({ type: "totals" }, { type: "signatures" });
      break;
    case "engine-warranty":
      sections.push({ type: "engine_block" }, { type: "warranty" }, { type: "qr" }, { type: "signatures" });
      break;
    case "service-tag":
      sections.push({ type: "oil_interval" });
      break;
    case "invoice":
    case "engine-waybill":
      if (context.order.motorLines.length > 0) sections.push({ type: "engine_block" });
      sections.push({ type: "totals" }, { type: "signatures" });
      break;
    case "commercial-proposal":
      if (context.order.laborLines.length > 0) sections.push({ type: "labor_table" });
      if (context.order.partLines.length > 0) sections.push({ type: "parts_table" });
      if (context.order.motorLines.length > 0) sections.push({ type: "engine_block" });
      sections.push({ type: "totals" }, { type: "signatures" });
      break;
    default:
      sections.push({ type: "signatures" });
  }

  return sections;
}
