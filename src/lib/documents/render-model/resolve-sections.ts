import { DocumentSectionKey, DocumentSectionConfig, isSectionEnabled } from "@/domain/document-config";
import { DocumentSlug } from "@/lib/documents/document-types";
import { DocumentTemplateLayout } from "@/lib/documents/templates/document-template-meta";
import { DocumentContext } from "@/lib/documents/document-context";
import { classifyServiceOrder } from "@/lib/documents/classify-service-order";
import {
  hasMotorSaleBuyer,
  isStandaloneMotorSale,
} from "@/lib/documents/motor-sale-document";
import { buildDocumentPhotos } from "@/lib/documents/render-model/build-document-photos";
import {
  documentPrimaryMotor,
  documentPrimaryMotorEntity,
} from "@/lib/documents/document-helpers";

/** Default section order per document slug. */
const SLUG_SECTION_ORDER: Record<DocumentSlug, DocumentSectionKey[]> = {
  "work-order": [
    "hero",
    "motor_spotlight",
    "acceptance",
    "vehicle",
    "labor",
    "parts",
    "engine",
    "transmission",
    "diagnostics",
    "vehicle_history",
    "aggregate_history",
    "photos",
    "recommendations",
    "totals",
    "warranty",
    "disclaimer",
    "signatures",
    "qr",
  ],
  "service-act": [
    "hero",
    "vehicle",
    "labor",
    "parts",
    "engine",
    "vehicle_history",
    "totals",
    "warranty",
    "signatures",
    "qr",
  ],
  "engine-warranty": [
    "hero",
    "motor_spotlight",
    "vehicle",
    "engine",
    "warranty",
    "photos",
    "signatures",
    "qr",
  ],
  "service-tag": ["hero"],
  "invoice": ["hero", "vehicle", "engine", "totals", "disclaimer", "signatures", "qr"],
  "engine-waybill": ["hero", "motor_spotlight", "vehicle", "engine", "totals", "signatures", "qr"],
  "commercial-proposal": [
    "hero",
    "vehicle",
    "labor",
    "parts",
    "engine",
    "recommendations",
    "totals",
    "signatures",
    "qr",
  ],
  "vehicle-intake-act": ["hero", "vehicle", "photos", "diagnostics", "disclaimer", "signatures", "qr"],
  "sales-receipt": ["hero", "vehicle", "engine", "parts", "totals", "signatures", "qr"],
};

function layoutAllowsSection(
  slug: DocumentSlug,
  key: DocumentSectionKey,
  layout: DocumentTemplateLayout,
  context: DocumentContext,
): boolean {
  const profile = classifyServiceOrder(context);
  const hasMotor = Boolean(documentPrimaryMotor(context));
  const motorEntity = documentPrimaryMotorEntity(context);
  const hasTransmission = Boolean(motorEntity?.transmission?.trim());

  switch (key) {
    case "hero":
      return true;
    case "motor_spotlight":
      return layout.showMotorSpotlight && hasMotor;
    case "acceptance":
      return layout.showAcceptanceBanner;
    case "vehicle":
      if (isStandaloneMotorSale(context) && !hasMotorSaleBuyer(context)) return false;
      return layout.showClientVehicle;
    case "labor":
      return layout.showLabor && context.order.laborLines.length > 0;
    case "parts":
      return layout.showParts && (context.order.partLines.length > 0 || context.order.motorLines.length > 0);
    case "engine":
      return hasMotor && (layout.showMotorSpotlight || slug === "engine-warranty" || slug === "engine-waybill");
    case "transmission":
      return hasTransmission;
    case "warranty":
      return layout.showWarrantyTerms || profile.showEngineWarranty || slug === "engine-warranty";
    case "vehicle_history":
      if (context.company.showServiceLogbook === false) return false;
      return layout.showTimeline;
    case "aggregate_history":
      if (slug === "engine-warranty") return false;
      return hasMotor && !isStandaloneMotorSale(context);
    case "photos":
      return buildDocumentPhotos(context).length > 0;
    case "diagnostics":
      return profile.showDiagnosticsNotes && Boolean(context.order.comment?.trim());
    case "recommendations":
      return Boolean(context.order.comment?.trim());
    case "totals":
      return layout.showMoneyTotals;
    case "disclaimer":
      return layout.showDisclaimer && !layout.showAcceptanceBanner;
    case "signatures":
      return true;
    case "qr":
      return true;
    default:
      return true;
  }
}

export function resolveEnabledSections(
  slug: DocumentSlug,
  layout: DocumentTemplateLayout,
  context: DocumentContext,
  companySections?: DocumentSectionConfig,
): DocumentSectionKey[] {
  const order = SLUG_SECTION_ORDER[slug] ?? SLUG_SECTION_ORDER["work-order"];

  return order.filter((key) => {
    if (!layoutAllowsSection(slug, key, layout, context)) return false;
    return isSectionEnabled(companySections, key, true);
  });
}
