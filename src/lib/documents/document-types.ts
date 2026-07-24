import { WorkOrderDocumentType } from "@/domain/work-order";
import { userCopy } from "@/lib/user-copy";

export type DocumentSlug =
  | "work-order"
  | "service-act"
  | "engine-warranty"
  | "service-tag"
  | "invoice"
  | "engine-waybill"
  | "commercial-proposal"
  | "vehicle-intake-act"
  | "sales-receipt";

export type DocumentDefinition = {
  slug: DocumentSlug;
  type: WorkOrderDocumentType;
  title: string;
  description: string;
  pageSize: "A4" | "service-tag";
};

/** Locale-aware catalog — titles/descriptions follow active `userCopy` locale. */
export const DOCUMENT_DEFINITIONS: DocumentDefinition[] = [
  {
    slug: "work-order",
    type: "work_order_pdf",
    get title() {
      return userCopy.documents.catalog["work-order"].title;
    },
    get description() {
      return userCopy.documents.catalog["work-order"].description;
    },
    pageSize: "A4",
  },
  {
    slug: "service-act",
    type: "completion_act",
    get title() {
      return userCopy.documents.catalog["service-act"].title;
    },
    get description() {
      return userCopy.documents.catalog["service-act"].description;
    },
    pageSize: "A4",
  },
  {
    slug: "engine-warranty",
    type: "engine_warranty",
    get title() {
      return userCopy.documents.catalog["engine-warranty"].title;
    },
    get description() {
      return userCopy.documents.catalog["engine-warranty"].description;
    },
    pageSize: "A4",
  },
  {
    slug: "service-tag",
    type: "maintenance_tag",
    get title() {
      return userCopy.documents.catalog["service-tag"].title;
    },
    get description() {
      return userCopy.documents.catalog["service-tag"].description;
    },
    pageSize: "service-tag",
  },
  {
    slug: "invoice",
    type: "client_invoice",
    get title() {
      return userCopy.documents.catalog.invoice.title;
    },
    get description() {
      return userCopy.documents.catalog.invoice.description;
    },
    pageSize: "A4",
  },
  {
    slug: "engine-waybill",
    type: "engine_waybill",
    get title() {
      return userCopy.documents.catalog["engine-waybill"].title;
    },
    get description() {
      return userCopy.documents.catalog["engine-waybill"].description;
    },
    pageSize: "A4",
  },
  {
    slug: "commercial-proposal",
    type: "commercial_proposal",
    get title() {
      return userCopy.documents.catalog["commercial-proposal"].title;
    },
    get description() {
      return userCopy.documents.catalog["commercial-proposal"].description;
    },
    pageSize: "A4",
  },
  {
    slug: "vehicle-intake-act",
    type: "vehicle_intake_act",
    get title() {
      return userCopy.documents.catalog["vehicle-intake-act"].title;
    },
    get description() {
      return userCopy.documents.catalog["vehicle-intake-act"].description;
    },
    pageSize: "A4",
  },
  {
    slug: "sales-receipt",
    type: "sales_receipt",
    get title() {
      return userCopy.documents.catalog["sales-receipt"].title;
    },
    get description() {
      return userCopy.documents.catalog["sales-receipt"].description;
    },
    pageSize: "A4",
  },
];

export const DOCUMENT_BY_SLUG = Object.fromEntries(
  DOCUMENT_DEFINITIONS.map((definition) => [definition.slug, definition]),
) as Record<DocumentSlug, DocumentDefinition>;

export const DOCUMENT_BY_TYPE = Object.fromEntries(
  DOCUMENT_DEFINITIONS.map((definition) => [definition.type, definition]),
) as Record<WorkOrderDocumentType, DocumentDefinition>;

export const ALL_DOCUMENT_SLUGS = DOCUMENT_DEFINITIONS.map((definition) => definition.slug);

export function isDocumentSlug(value: string): value is DocumentSlug {
  return value in DOCUMENT_BY_SLUG;
}

export function resolveDocumentSlug(value: string): DocumentSlug | null {
  return isDocumentSlug(value) ? value : null;
}
