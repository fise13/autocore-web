import { DocumentTheme } from "@/domain/company-branding";
import { userCopy } from "@/lib/user-copy";

export type DocumentTemplateVariant =
  | "work-order"
  | "service-act"
  | "engine-warranty"
  | "invoice"
  | "engine-waybill"
  | "commercial-proposal"
  | "vehicle-intake-act"
  | "sales-receipt";

export type DocumentTemplateMeta = {
  title: string;
  tag: string;
  lead: string;
  primaryLabel: string;
  warrantyBlock: string;
  footer: string;
  disclaimer?: string;
};

export type DocumentTemplateLayout = {
  showTimeline: boolean;
  showMoneyTotals: boolean;
  showLabor: boolean;
  showParts: boolean;
  showClientVehicle: boolean;
  showAcceptanceBanner: boolean;
  showMotorSpotlight: boolean;
  showWarrantyTerms: boolean;
  showUnifiedLineItems: boolean;
  showDisclaimer: boolean;
  useOrderStatusTag: boolean;
};

function templateMeta(variant: DocumentTemplateVariant): DocumentTemplateMeta {
  const entry = userCopy.documents.templates[variant];
  return {
    title: entry.title,
    tag: entry.tag,
    lead: entry.lead,
    primaryLabel: entry.primaryLabel,
    warrantyBlock: entry.warrantyBlock,
    footer: entry.footer,
    ...("disclaimer" in entry && entry.disclaimer ? { disclaimer: entry.disclaimer } : {}),
  };
}

/** Locale-aware via `userCopy` / active AppLocale (remount on locale change). */
export const DOCUMENT_TEMPLATE_META: Record<DocumentTemplateVariant, DocumentTemplateMeta> = {
  get "work-order"() {
    return templateMeta("work-order");
  },
  get "service-act"() {
    return templateMeta("service-act");
  },
  get "engine-warranty"() {
    return templateMeta("engine-warranty");
  },
  get invoice() {
    return templateMeta("invoice");
  },
  get "engine-waybill"() {
    return templateMeta("engine-waybill");
  },
  get "commercial-proposal"() {
    return templateMeta("commercial-proposal");
  },
  get "vehicle-intake-act"() {
    return templateMeta("vehicle-intake-act");
  },
  get "sales-receipt"() {
    return templateMeta("sales-receipt");
  },
};

export const DOCUMENT_TEMPLATE_LAYOUT: Record<DocumentTemplateVariant, DocumentTemplateLayout> = {
  "work-order": {
    showTimeline: true,
    showMoneyTotals: true,
    showLabor: true,
    showParts: true,
    showClientVehicle: true,
    showAcceptanceBanner: false,
    showMotorSpotlight: false,
    showWarrantyTerms: false,
    showUnifiedLineItems: false,
    showDisclaimer: false,
    useOrderStatusTag: true,
  },
  "service-act": {
    showTimeline: false,
    showMoneyTotals: true,
    showLabor: true,
    showParts: true,
    showClientVehicle: true,
    showAcceptanceBanner: true,
    showMotorSpotlight: false,
    showWarrantyTerms: false,
    showUnifiedLineItems: false,
    showDisclaimer: true,
    useOrderStatusTag: false,
  },
  "engine-warranty": {
    showTimeline: false,
    showMoneyTotals: false,
    showLabor: false,
    showParts: false,
    showClientVehicle: true,
    showAcceptanceBanner: false,
    showMotorSpotlight: true,
    showWarrantyTerms: true,
    showUnifiedLineItems: false,
    showDisclaimer: false,
    useOrderStatusTag: false,
  },
  invoice: {
    showTimeline: false,
    showMoneyTotals: true,
    showLabor: false,
    showParts: false,
    showClientVehicle: true,
    showAcceptanceBanner: false,
    showMotorSpotlight: false,
    showWarrantyTerms: false,
    showUnifiedLineItems: true,
    showDisclaimer: true,
    useOrderStatusTag: false,
  },
  "engine-waybill": {
    showTimeline: false,
    showMoneyTotals: false,
    showLabor: false,
    showParts: false,
    showClientVehicle: true,
    showAcceptanceBanner: false,
    showMotorSpotlight: true,
    showWarrantyTerms: false,
    showUnifiedLineItems: false,
    showDisclaimer: true,
    useOrderStatusTag: false,
  },
  "commercial-proposal": {
    showTimeline: false,
    showMoneyTotals: true,
    showLabor: true,
    showParts: true,
    showClientVehicle: true,
    showAcceptanceBanner: false,
    showMotorSpotlight: false,
    showWarrantyTerms: false,
    showUnifiedLineItems: false,
    showDisclaimer: true,
    useOrderStatusTag: false,
  },
  "vehicle-intake-act": {
    showTimeline: true,
    showMoneyTotals: false,
    showLabor: false,
    showParts: false,
    showClientVehicle: true,
    showAcceptanceBanner: true,
    showMotorSpotlight: false,
    showWarrantyTerms: false,
    showUnifiedLineItems: false,
    showDisclaimer: true,
    useOrderStatusTag: false,
  },
  "sales-receipt": {
    showTimeline: false,
    showMoneyTotals: true,
    showLabor: false,
    showParts: true,
    showClientVehicle: true,
    showAcceptanceBanner: false,
    showMotorSpotlight: false,
    showWarrantyTerms: false,
    showUnifiedLineItems: true,
    showDisclaimer: true,
    useOrderStatusTag: false,
  },
};

export const DOCUMENT_TEMPLATE_THEME_NOTES: Record<DocumentTheme, string> = {
  get classic() {
    return userCopy.documents.themeNotes.classic;
  },
  get premium() {
    return userCopy.documents.themeNotes.premium;
  },
  get modern() {
    return userCopy.documents.themeNotes.modern;
  },
  get racing() {
    return userCopy.documents.themeNotes.racing;
  },
};

export function getDocumentTemplateTimelineLabels(): readonly [
  string,
  string,
  string,
  string,
  string,
  string,
] {
  return userCopy.documents.timelineLabels;
}

/** Locale-aware timeline labels (reads active `userCopy`). */
export const DOCUMENT_TEMPLATE_TIMELINE_LABELS = new Proxy([] as unknown as readonly [
  string,
  string,
  string,
  string,
  string,
  string,
], {
  get(_target, prop, receiver) {
    const labels = getDocumentTemplateTimelineLabels();
    const value = Reflect.get(labels, prop, receiver);
    return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(labels) : value;
  },
  ownKeys() {
    return Reflect.ownKeys(getDocumentTemplateTimelineLabels());
  },
  getOwnPropertyDescriptor(_target, prop) {
    return Reflect.getOwnPropertyDescriptor(getDocumentTemplateTimelineLabels(), prop);
  },
  has(_target, prop) {
    return Reflect.has(getDocumentTemplateTimelineLabels(), prop);
  },
});

export const DOCUMENT_TEMPLATE_HTML_NAME: Record<
  Extract<DocumentTemplateVariant, "work-order" | "service-act" | "engine-warranty">,
  string
> = {
  "work-order": "work-order",
  "service-act": "completion-act",
  "engine-warranty": "warranty",
};
