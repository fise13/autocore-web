import { parseCompanyDocumentConfig } from "@/domain/document-config";
import { DocumentTheme } from "@/domain/company-branding";
import { STATUS_LABELS } from "@/components/work-orders/work-order-copy";
import { companyBrandStyle } from "@/lib/documents/company-brand";
import { ensureDocumentHeaderConfig } from "@/domain/document-header-config";
import { ensureDocumentWatermarkConfig } from "@/domain/document-watermark-config";
import { buildDocumentHeaderModel } from "@/lib/documents/header/build-document-header-model";
import { buildWatermarkRenderModel } from "@/lib/documents/watermark/build-watermark-render-model";
import {
  DocumentContext,
  DocumentUiLabels,
  resolveDocumentUi,
} from "@/lib/documents/document-context";
import {
  buildLaborLinesForDocument,
  buildPartLinesForDocument,
  classifyServiceOrder,
} from "@/lib/documents/classify-service-order";
import {
  documentAssigneeSummary,
  documentClientName,
  documentClientPhone,
  documentLaborLineTotal,
  documentOrderDate,
  documentPrimaryMotor,
  documentPrimaryMotorEntity,
  documentVehicleLabel,
} from "@/lib/documents/document-helpers";
import {
  adaptWarrantyForMotorSale,
  isStandaloneMotorSale,
  motorSaleDocumentMeta,
} from "@/lib/documents/motor-sale-document";
import { DocumentSlug, isDocumentSlug } from "@/lib/documents/document-types";
import { addDays, formatDocumentDate, formatDocumentMoney } from "@/lib/documents/format";
import {
  DOCUMENT_TEMPLATE_LAYOUT,
  DOCUMENT_TEMPLATE_META,
  DocumentTemplateMeta,
  DocumentTemplateVariant,
} from "@/lib/documents/templates/document-template-meta";
import { documentThemeClass } from "@/lib/documents/themes/tokens";
import { documentThemeStyleVars } from "@/lib/documents/themes/theme-tokens";
import { documentTypography, typographyStyleVars } from "@/lib/documents/themes/typography";
import { resolveWarrantyForDocument } from "@/lib/documents/warranty/resolve-warranty";
import { resolveDocumentQrTarget } from "@/lib/documents/render-model/qr-targets";
import { resolveEnabledSections } from "@/lib/documents/render-model/resolve-sections";
import { buildDocumentPhotos } from "@/lib/documents/render-model/build-document-photos";
import {
  buildAggregateHistoryTimeline,
  buildVehicleHistoryTimeline,
} from "@/lib/documents/render-model/timelines";
import { buildRacingViewModel } from "@/lib/documents/render-model/build-racing-view-model";
import {
  DocumentRenderModel,
  DocumentSectionModel,
  DocumentLineItem,
} from "@/lib/documents/render-model/types";
import {
  formatMotorDisplayName,
  formatMotorLineLabel,
  formatMotorLineSubtitle,
} from "@/lib/motors/format-motor-display-name";

function slugToVariant(slug: DocumentSlug): DocumentTemplateVariant {
  return slug as DocumentTemplateVariant;
}

function resolveTemplateMeta(
  context: DocumentContext,
  variant: DocumentTemplateVariant,
): DocumentTemplateMeta {
  return {
    ...DOCUMENT_TEMPLATE_META[variant],
    ...context.templateMeta?.[variant],
  };
}

function resolveStatusLabel(context: DocumentContext, fallbackTag: string): string {
  const fromContext = context.statusLabels?.[context.order.status];
  if (fromContext) return fromContext;
  return STATUS_LABELS[context.order.status] ?? fallbackTag;
}

function resolveInvoiceDisclaimer(
  disclaimer: string | undefined,
  invoiceDays: number,
): string | undefined {
  if (!disclaimer) return disclaimer;
  if (disclaimer.includes("{days}")) {
    return disclaimer.replaceAll("{days}", String(invoiceDays));
  }
  return disclaimer.replace(/\d+\s+рабочих\s+дней?/i, `${invoiceDays} рабочих дней`);
}

function buildUnifiedLineItems(context: DocumentContext, ui: DocumentUiLabels): DocumentLineItem[] {
  const { order } = context;
  const motorSale = isStandaloneMotorSale(context);
  const rows: DocumentLineItem[] = [];

  for (const line of order.laborLines) {
    rows.push({
      id: line.id,
      title: line.title,
      subtitle: ui.laborKind,
      quantity: line.hours > 0 ? `${line.hours}${ui.hoursSuffix}` : "1",
      amount: formatDocumentMoney(documentLaborLineTotal(line)),
    });
  }
  for (const line of order.partLines) {
    rows.push({
      id: line.id,
      title: line.name,
      subtitle: ui.partKind,
      quantity: String(line.quantity),
      amount: formatDocumentMoney(line.quantity * line.unitPrice),
    });
  }
  for (const line of order.motorLines) {
    const marks = (context.motorLineMarks?.[line.id] ?? []).filter(Boolean);
    const markSuffix = marks.length > 0 ? ` · ${marks.join(" · ")}` : "";
    rows.push({
      id: line.id,
      title: formatMotorLineLabel(line),
      subtitle: `${motorSale ? ui.contractEngine : ui.engine}${markSuffix}`,
      quantity: "1",
      amount: formatDocumentMoney(line.unitPrice),
    });
  }
  return rows;
}

function buildPrimaryValue(
  context: DocumentContext,
  slug: DocumentSlug,
  warrantyDays: number,
  warrantyKm: number,
  ui: DocumentUiLabels,
): string {
  const { order } = context;
  const motor = documentPrimaryMotor(context);

  if (slug === "engine-warranty") {
    return ui.daysKm
      .replace("{days}", String(warrantyDays))
      .replace("{km}", warrantyKm.toLocaleString("ru-KZ"));
  }
  if (slug === "engine-waybill" && motor) {
    return formatDocumentMoney(motor.unitPrice);
  }
  return formatDocumentMoney(order.pricing.grandTotal);
}

function buildSections(
  context: DocumentContext,
  slug: DocumentSlug,
  variant: DocumentTemplateVariant,
  enabledKeys: ReturnType<typeof resolveEnabledSections>,
  warranty: ReturnType<typeof resolveWarrantyForDocument>,
  options?: { qrDataUri?: string; disclaimerText?: string },
): DocumentSectionModel[] {
  const ui = resolveDocumentUi(context.ui);
  const qrDataUri = options?.qrDataUri;
  const resolvedDisclaimer = options?.disclaimerText;
  const { company, order, client, vehicle } = context;
  const motorSale = isStandaloneMotorSale(context);
  const baseMeta = resolveTemplateMeta(context, variant);
  const meta = motorSale ? motorSaleDocumentMeta(slug, baseMeta, context.locale) : baseMeta;
  const layout = DOCUMENT_TEMPLATE_LAYOUT[variant];
  const profile = classifyServiceOrder(context);
  const motorLine = documentPrimaryMotor(context);
  const motorEntity = documentPrimaryMotorEntity(context);
  const motorMarks = motorLine ? (context.motorLineMarks?.[motorLine.id] ?? []) : [];
  const motorMarkLabel = motorMarks.length > 0 ? motorMarks.join(" · ") : null;
  const transmissionValue = motorEntity?.transmission?.trim() || motorMarkLabel || "";
  const executorName = documentAssigneeSummary(context);
  const documentDate = formatDocumentDate(documentOrderDate(context));
  const mileage = order.mileage || vehicle?.currentMileage || 0;
  const plate = order.licensePlate || vehicle?.licensePlate;
  const clientEmail = client?.email ?? "—";
  const motorOnlyTotal = order.pricing.motorsTotal;
  const warrantyNote = warranty.note;
  const recommendations = order.comment?.trim() || null;
  const expiresAt = formatDocumentDate(addDays(documentOrderDate(context), warranty.days));
  const mileageText = mileage
    ? `${mileage.toLocaleString("ru-KZ")}${ui.kmSuffix}`
    : "—";

  const laborLines = buildLaborLinesForDocument(context);
  const partLines = buildPartLinesForDocument(context);

  const laborRows: DocumentLineItem[] = laborLines.map((line) => {
    const source = order.laborLines.find((item) => item.id === line.id);
    return {
      id: line.id,
      title: line.title,
      subtitle: line.subtitle || ui.serviceOperation,
      quantity:
        source?.hours && source.hours > 0 ? `${source.hours}${ui.hoursSuffix}` : "1",
      amount: line.amount,
    };
  });

  const partRows: DocumentLineItem[] = [
    ...partLines.map((line) => {
      const source = order.partLines.find((part) => part.id === line.id);
      return {
        id: line.id,
        title: line.title,
        subtitle: ui.partKind,
        quantity: source ? String(source.quantity) : "1",
        amount: line.amount,
      };
    }),
    ...order.motorLines.map((line) => {
      const marks = context.motorLineMarks?.[line.id];
      const base = ui.engine;
      const markSuffix = (marks ?? []).filter(Boolean).join(" · ");
      return {
        id: line.id,
        title: formatMotorLineLabel(line),
        subtitle: markSuffix ? `${base} · ${markSuffix}` : base,
        quantity: "1",
        amount: formatDocumentMoney(line.unitPrice),
      };
    }),
  ];

  const sections: DocumentSectionModel[] = [];

  for (const key of enabledKeys) {
    switch (key) {
      case "hero":
        sections.push({
          key: "hero",
          meta: {
            title: meta.title,
            lead: meta.lead,
            primaryLabel: meta.primaryLabel,
            primaryValue: buildPrimaryValue(context, slug, warranty.days, warranty.km, ui),
            primaryHint:
              slug === "engine-warranty"
                ? ui.untilDateValue.replace("{date}", expiresAt)
                : slug === "commercial-proposal"
                  ? ui.untilScopeAgreed
                  : null,
            executorName,
          },
        });
        break;
      case "acceptance":
        if (resolvedDisclaimer) sections.push({ key: "acceptance", text: resolvedDisclaimer });
        break;
      case "motor_spotlight":
        if (motorLine) {
          const displayName = formatMotorLineLabel(motorLine, {
            includeSerial: true,
            marks: motorMarks,
          });
          sections.push({
            key: "motor_spotlight",
            displayName,
            serialCode: motorLine.serialCode,
            meta: formatMotorDisplayName(motorLine) || motorLine.serialCode,
            fields: motorSale
              ? [
                  {
                    label: ui.brandCode,
                    value: [motorLine.brandName, motorLine.engineCode].filter(Boolean).join(" "),
                  },
                  { label: ui.configuration, value: motorLine.configuration || "—" },
                  ...(motorMarkLabel ? [{ label: ui.mark, value: motorMarkLabel }] : []),
                  { label: ui.cost, value: formatDocumentMoney(motorLine.unitPrice) },
                  { label: ui.saleDate, value: documentDate },
                ]
              : [
                  { label: ui.vehicle, value: documentVehicleLabel(context) },
                  { label: "VIN", value: order.vin || vehicle?.vin || "—" },
                  {
                    label: ui.operation,
                    value: formatMotorLineSubtitle(motorLine.outcome, motorMarks),
                  },
                  {
                    label: ui.engineMileage,
                    value: mileageText,
                  },
                ],
          });
        }
        break;
      case "vehicle":
        sections.push({
          key: "vehicle",
          plate: plate ?? undefined,
          clientCardTitle: motorSale ? ui.buyer : undefined,
          detailsCardTitle: motorSale ? ui.engine : undefined,
          sectionTitle: motorSale ? ui.deal : undefined,
          client: [
            { label: motorSale ? ui.buyer : ui.fullName, value: documentClientName(context) },
            { label: ui.phone, value: documentClientPhone(context) },
            { label: "Email", value: clientEmail },
            { label: ui.note, value: client?.notes?.trim() || "—" },
          ],
          vehicle: motorSale
            ? [
                {
                  label: ui.product,
                  value: formatMotorLineLabel(motorLine ?? {}, { includeSerial: true }) || "—",
                },
                { label: ui.serialNumber, value: motorLine?.serialCode || "—" },
                { label: ui.configuration, value: motorLine?.configuration || "—" },
                {
                  label: ui.sum,
                  value: motorLine ? formatDocumentMoney(motorLine.unitPrice) : "—",
                },
              ]
            : [
                { label: ui.makeModel, value: documentVehicleLabel(context) },
                { label: "VIN", value: order.vin || vehicle?.vin || "—" },
                { label: ui.mileage, value: mileageText },
                {
                  label: ui.engine,
                  value: motorLine ? formatMotorLineLabel(motorLine) : "—",
                },
              ],
        });
        break;
      case "engine":
        if (motorLine) {
          sections.push({
            key: "engine",
            label: motorSale ? ui.engineSpecs : ui.engine,
            fields: motorSale
              ? [
                  { label: ui.serialNumber, value: motorLine.serialCode },
                  {
                    label: ui.brandCode,
                    value: [motorLine.brandName, motorLine.engineCode].filter(Boolean).join(" "),
                  },
                  { label: ui.configuration, value: motorLine.configuration || "—" },
                  { label: ui.transmissionFull, value: transmissionValue || "—" },
                  { label: ui.cost, value: formatDocumentMoney(motorLine.unitPrice) },
                ]
              : [
                  { label: ui.number, value: motorLine.serialCode },
                  {
                    label: ui.model,
                    value: [motorLine.brandName, motorLine.engineCode].filter(Boolean).join(" "),
                  },
                  { label: ui.configuration, value: motorLine.configuration || "—" },
                  ...(motorMarkLabel ? [{ label: ui.mark, value: motorMarkLabel }] : []),
                  { label: ui.cost, value: formatDocumentMoney(motorLine.unitPrice) },
                ],
          });
        }
        break;
      case "transmission":
        if (transmissionValue) {
          sections.push({
            key: "transmission",
            label: ui.transmissionFull,
            value: transmissionValue,
          });
        }
        break;
      case "labor":
        if (laborRows.length > 0) {
          sections.push({
            key: "labor",
            title: ui.laborList,
            hint: ui.laborHint,
            rows: laborRows,
          });
        }
        break;
      case "parts":
        if (partRows.length > 0) {
          sections.push({
            key: "parts",
            title: ui.partsMaterials,
            hint: company.name,
            rows: partRows,
          });
        }
        break;
      case "warranty":
        if (layout.showWarrantyTerms || slug === "engine-warranty" || profile.showEngineWarranty) {
          const resolvedWarranty = motorSale
            ? adaptWarrantyForMotorSale(warranty, context.locale)
            : warranty;
          sections.push({ key: "warranty", warranty: resolvedWarranty, expiresAt });
        }
        break;
      case "vehicle_history": {
        const events = buildVehicleHistoryTimeline(context);
        if (events.length > 0) sections.push({ key: "vehicle_history", events });
        break;
      }
      case "aggregate_history": {
        const events = buildAggregateHistoryTimeline(context);
        if (events.length > 0) sections.push({ key: "aggregate_history", events });
        break;
      }
      case "photos": {
        const items = buildDocumentPhotos(context);
        if (items.length > 0) sections.push({ key: "photos", items });
        break;
      }
      case "diagnostics":
        if (order.comment?.trim()) {
          sections.push({ key: "diagnostics", text: order.comment.trim() });
        }
        break;
      case "recommendations":
        if (recommendations) sections.push({ key: "recommendations", text: recommendations });
        break;
      case "totals":
        sections.push({
          key: "totals",
          totals: motorSale
            ? {
                labor: null,
                parts: null,
                engine: formatDocumentMoney(motorOnlyTotal),
                transmission: null,
                discount:
                  order.pricing.discount > 0
                    ? `−${formatDocumentMoney(order.pricing.discount)}`
                    : null,
                tax: null,
                grandTotal: formatDocumentMoney(order.pricing.grandTotal),
                warrantyNote:
                  slug === "engine-warranty" ? (warrantyNote ?? meta.warrantyBlock ?? null) : null,
                recommendations: null,
              }
            : {
                labor: formatDocumentMoney(order.pricing.laborTotal),
                parts: formatDocumentMoney(order.pricing.partsTotal),
                engine: formatDocumentMoney(motorOnlyTotal),
                transmission: motorEntity?.transmission?.trim() || "—",
                discount:
                  order.pricing.discount > 0
                    ? `−${formatDocumentMoney(order.pricing.discount)}`
                    : null,
                tax: null,
                grandTotal: formatDocumentMoney(order.pricing.grandTotal),
                warrantyNote: warrantyNote ?? (meta.warrantyBlock || null),
                recommendations,
              },
        });
        break;
      case "disclaimer":
        if (resolvedDisclaimer) sections.push({ key: "disclaimer", text: resolvedDisclaimer });
        break;
      case "signatures":
        sections.push({
          key: "signatures",
          signatures: {
            executorLabel: motorSale
              ? ui.seller
              : slug === "engine-waybill"
                ? ui.handedOver
                : ui.executorRole,
            executorName,
            clientLabel: motorSale
              ? ui.buyer
              : slug === "engine-waybill"
                ? ui.receivedClient
                : ui.client,
            clientName: documentClientName(context),
          },
        });
        break;
      case "qr":
        if (qrDataUri) {
          const target = resolveDocumentQrTarget(slug, context, {
            companyQrLinkUrl: context.company.documentConfig?.qrLinkUrl,
          });
          sections.push({
            key: "qr",
            qr: { dataUri: qrDataUri, targetUrl: target.url, label: target.label },
          });
        }
        break;
      default:
        break;
    }
  }

  if (layout.showUnifiedLineItems && enabledKeys.includes("totals" as never)) {
    const unified = buildUnifiedLineItems(context, ui);
    if (unified.length > 0) {
      const idx = sections.findIndex((s) => s.key === "totals");
      const block: DocumentSectionModel = {
        key: "unified_lines",
        title: motorSale ? ui.engineToPay : ui.itemsToPay,
        hint: motorSale ? ui.oneItem : ui.itemsCount.replace("{n}", String(unified.length)),
        rows: unified,
      };
      if (idx >= 0) sections.splice(idx, 0, block);
      else sections.push(block);
    }
  }

  return sections;
}

export function buildDocumentRenderModel(
  context: DocumentContext,
  slugOrVariant: DocumentSlug | DocumentTemplateVariant,
  qrDataUri?: string,
): DocumentRenderModel {
  const slug: DocumentSlug = isDocumentSlug(slugOrVariant)
    ? slugOrVariant
    : (slugOrVariant as DocumentSlug);
  const variant = slugToVariant(slug);
  const motorSale = isStandaloneMotorSale(context);
  const ui = resolveDocumentUi(context.ui);
  const baseMeta = resolveTemplateMeta(context, variant);
  const meta = motorSale ? motorSaleDocumentMeta(slug, baseMeta, context.locale) : baseMeta;
  const layout = DOCUMENT_TEMPLATE_LAYOUT[variant];
  const theme = (context.theme ?? "modern") as DocumentTheme;
  const typography = documentTypography(theme);
  const { company } = context;

  const documentConfig = company.documentConfig ?? parseCompanyDocumentConfig({});
  const profile = classifyServiceOrder(context);
  const warranty = resolveWarrantyForDocument(company, documentConfig, {
    forEngine: profile.showEngineWarranty || motorSale,
    forWork: slug === "work-order" || slug === "service-act",
    override: context.warrantyOverride,
  });

  const enabledKeys = resolveEnabledSections(slug, layout, context, documentConfig.sections);

  const documentTag = layout.useOrderStatusTag
    ? resolveStatusLabel(context, meta.tag)
    : meta.tag;

  let footerText = documentConfig.documentFooter ?? meta.footer.replace(/AutoCore/g, company.name);
  const invoiceDays = documentConfig.invoiceValidityDays ?? 5;
  const disclaimerText =
    slug === "invoice"
      ? resolveInvoiceDisclaimer(meta.disclaimer, invoiceDays)
      : meta.disclaimer;

  const resolvedWarranty =
    motorSale && slug === "engine-warranty"
      ? adaptWarrantyForMotorSale(warranty, context.locale)
      : warranty;

  const headerConfig = ensureDocumentHeaderConfig(company.headerConfig, theme);
  const watermarkConfig = ensureDocumentWatermarkConfig(company.watermarkConfig, theme);

  const header = buildDocumentHeaderModel({
    theme,
    companyName: company.name,
    shortName: company.shortName,
    slogan: company.slogan,
    address: company.address,
    phone: company.phone,
    email: company.email,
    website: company.website,
    logoDataUri: company.logoDataUri,
    primaryColor: company.primaryColor,
    headerConfig,
    documentTitle: meta.title,
    documentTag: documentTag,
    orderLabel: context.orderLabel,
    documentDate: formatDocumentDate(documentOrderDate(context)),
    qrDataUri: qrDataUri,
  });

  return {
    meta: {
      slug,
      variant,
      title: meta.title,
      tag: documentTag,
      lead: meta.lead,
      disclaimer: disclaimerText ?? "",
      footer: footerText,
      orderLabel: context.orderLabel,
      documentDate: formatDocumentDate(documentOrderDate(context)),
      primaryLabel: meta.primaryLabel,
      primaryValue: buildPrimaryValue(
        context,
        slug,
        resolvedWarranty.days,
        resolvedWarranty.km,
        ui,
      ),
      primaryHint: null,
      executorName: documentAssigneeSummary(context),
    },
    header,
    theme,
    typographyVars: typographyStyleVars(typography),
    themeStyleVars: documentThemeStyleVars(theme, company.primaryColor),
    brandStyle: companyBrandStyle(company, theme),
    themeClass: documentThemeClass(theme),
    pageClass: `doc-pdf-page--${variant}`,
    documentWatermark: buildWatermarkRenderModel({
      config: watermarkConfig,
      logoDataUri: company.logoDataUri,
      companyName: company.shortName?.trim() || company.name,
    }),
    sections: buildSections(context, slug, variant, enabledKeys, warranty, {
      qrDataUri,
      disclaimerText: disclaimerText ?? meta.disclaimer,
    }),
    racing:
      theme === "racing" && !motorSale
        ? buildRacingViewModel(context, {
            disclaimer: disclaimerText ?? meta.disclaimer,
            showServiceLogbook: context.company.showServiceLogbook !== false,
          })
        : undefined,
    ui,
  };
}
