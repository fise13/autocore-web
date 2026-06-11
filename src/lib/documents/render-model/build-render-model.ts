import { parseCompanyDocumentConfig } from "@/domain/document-config";
import { DocumentTheme } from "@/domain/company-branding";
import { STATUS_LABELS } from "@/components/work-orders/work-order-copy";
import { companyBrandStyle, companyMonogram } from "@/lib/documents/company-brand";
import { ensureDocumentHeaderConfig } from "@/domain/document-header-config";
import { ensureDocumentWatermarkConfig } from "@/domain/document-watermark-config";
import { buildDocumentHeaderModel } from "@/lib/documents/header/build-document-header-model";
import { buildWatermarkRenderModel } from "@/lib/documents/watermark/build-watermark-render-model";
import { DocumentContext } from "@/lib/documents/document-context";
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
import { addMonths, formatDocumentDate, formatDocumentMoney } from "@/lib/documents/format";
import {
  DOCUMENT_TEMPLATE_LAYOUT,
  DOCUMENT_TEMPLATE_META,
  DocumentTemplateVariant,
} from "@/lib/documents/templates/document-template-meta";
import { documentThemeClass } from "@/lib/documents/themes/tokens";
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

function slugToVariant(slug: DocumentSlug): DocumentTemplateVariant {
  return slug as DocumentTemplateVariant;
}

function buildUnifiedLineItems(context: DocumentContext): DocumentLineItem[] {
  const { order } = context;
  const motorSale = isStandaloneMotorSale(context);
  const rows: DocumentLineItem[] = [];

  for (const line of order.laborLines) {
    rows.push({
      id: line.id,
      title: line.title,
      subtitle: "Работа",
      quantity: line.hours > 0 ? `${line.hours} ч` : "1",
      amount: formatDocumentMoney(documentLaborLineTotal(line)),
    });
  }
  for (const line of order.partLines) {
    rows.push({
      id: line.id,
      title: line.name,
      subtitle: line.sku ? `Арт. ${line.sku}` : "Запчасть",
      quantity: String(line.quantity),
      amount: formatDocumentMoney(line.quantity * line.unitPrice),
    });
  }
  for (const line of order.motorLines) {
    rows.push({
      id: line.id,
      title: [line.brandName, line.engineCode, line.serialCode].filter(Boolean).join(" "),
      subtitle: motorSale ? "Контрактный двигатель" : "Двигатель",
      quantity: "1",
      amount: formatDocumentMoney(line.unitPrice),
    });
  }
  return rows;
}

function buildPrimaryValue(
  context: DocumentContext,
  slug: DocumentSlug,
  warrantyMonths: number,
  warrantyKm: number,
): string {
  const { order } = context;
  const motor = documentPrimaryMotor(context);

  if (slug === "engine-warranty") {
    return `${warrantyMonths} мес · ${warrantyKm.toLocaleString("ru-KZ")} км`;
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
  const qrDataUri = options?.qrDataUri;
  const resolvedDisclaimer = options?.disclaimerText;
  const { company, order, client, vehicle } = context;
  const motorSale = isStandaloneMotorSale(context);
  const baseMeta = DOCUMENT_TEMPLATE_META[variant];
  const meta = motorSale ? motorSaleDocumentMeta(slug, baseMeta) : baseMeta;
  const layout = DOCUMENT_TEMPLATE_LAYOUT[variant];
  const profile = classifyServiceOrder(context);
  const motorLine = documentPrimaryMotor(context);
  const motorEntity = documentPrimaryMotorEntity(context);
  const executorName = documentAssigneeSummary(context);
  const documentDate = formatDocumentDate(documentOrderDate(context));
  const mileage = order.mileage || vehicle?.currentMileage || 0;
  const plate = order.licensePlate || vehicle?.licensePlate;
  const clientEmail = client?.email ?? "—";
  const partsTotal = order.pricing.partsTotal + order.pricing.motorsTotal;
  const motorOnlyTotal = order.pricing.motorsTotal;
  const warrantyNote = warranty.note;
  const recommendations = order.comment?.trim() || null;
  const expiresAt = formatDocumentDate(addMonths(documentOrderDate(context), warranty.months));

  const laborLines = buildLaborLinesForDocument(context);
  const partLines = buildPartLinesForDocument(context);

  const laborRows: DocumentLineItem[] = laborLines.map((line) => {
    const source = order.laborLines.find((item) => item.id === line.id);
    return {
      id: line.id,
      title: line.title,
      subtitle: line.subtitle || "Сервисная операция",
      quantity: source?.hours && source.hours > 0 ? `${source.hours} ч` : "1",
      amount: line.amount,
    };
  });

  const partRows: DocumentLineItem[] = [
    ...partLines.map((line) => {
      const source = order.partLines.find((part) => part.id === line.id);
      return {
        id: line.id,
        title: line.title,
        subtitle: source?.sku ? `Арт. ${source.sku}` : "Запчасть",
        quantity: source ? String(source.quantity) : "1",
        amount: line.amount,
      };
    }),
    ...order.motorLines.map((line) => ({
      id: line.id,
      title: [line.brandName, line.engineCode, line.serialCode].filter(Boolean).join(" "),
      subtitle: "Двигатель",
      quantity: "1",
      amount: formatDocumentMoney(line.unitPrice),
    })),
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
            primaryValue: buildPrimaryValue(context, slug, warranty.months, warranty.km),
            primaryHint:
              slug === "engine-warranty"
                ? `до ${expiresAt}`
                : slug === "commercial-proposal"
                  ? "до согласования состава работ"
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
          sections.push({
            key: "motor_spotlight",
            serialCode: motorLine.serialCode,
            meta: [motorLine.brandName, motorLine.engineCode, motorLine.configuration].filter(Boolean).join(" · "),
            fields: motorSale
              ? [
                  { label: "Марка / код", value: [motorLine.brandName, motorLine.engineCode].filter(Boolean).join(" ") },
                  { label: "Комплектация", value: motorLine.configuration || "—" },
                  { label: "Стоимость", value: formatDocumentMoney(motorLine.unitPrice) },
                  { label: "Дата продажи", value: documentDate },
                ]
              : [
                  { label: "Автомобиль", value: documentVehicleLabel(context) },
                  { label: "VIN", value: order.vin || vehicle?.vin || "—" },
                  {
                    label: "Операция",
                    value: motorLine.outcome === "install" ? "Установка" : "Продажа",
                  },
                  {
                    label: "Пробег ДВС",
                    value: mileage ? `${mileage.toLocaleString("ru-KZ")} км` : "—",
                  },
                ],
          });
        }
        break;
      case "vehicle":
        sections.push({
          key: "vehicle",
          plate: plate ?? undefined,
          clientCardTitle: motorSale ? "Покупатель" : undefined,
          detailsCardTitle: motorSale ? "Двигатель" : undefined,
          sectionTitle: motorSale ? "Сделка" : undefined,
          client: [
            { label: motorSale ? "Покупатель" : "ФИО", value: documentClientName(context) },
            { label: "Телефон", value: documentClientPhone(context) },
            { label: "Email", value: clientEmail },
            { label: "Примечание", value: client?.notes?.trim() || "—" },
          ],
          vehicle: motorSale
            ? [
                { label: "Товар", value: [motorLine?.brandName, motorLine?.engineCode, motorLine?.serialCode].filter(Boolean).join(" ") || "—" },
                { label: "Серийный номер", value: motorLine?.serialCode || "—" },
                { label: "Комплектация", value: motorLine?.configuration || "—" },
                { label: "Сумма", value: motorLine ? formatDocumentMoney(motorLine.unitPrice) : "—" },
              ]
            : [
                { label: "Марка / модель", value: documentVehicleLabel(context) },
                { label: "VIN", value: order.vin || vehicle?.vin || "—" },
                { label: "Пробег", value: mileage ? `${mileage.toLocaleString("ru-KZ")} км` : "—" },
                {
                  label: "Двигатель",
                  value: motorLine
                    ? [motorLine.brandName, motorLine.engineCode, motorLine.configuration].filter(Boolean).join(", ")
                    : "—",
                },
              ],
        });
        break;
      case "engine":
        if (motorLine) {
          sections.push({
            key: "engine",
            label: motorSale ? "Характеристики двигателя" : "Двигатель",
            fields: motorSale
              ? [
                  { label: "Серийный номер", value: motorLine.serialCode },
                  { label: "Марка / код", value: [motorLine.brandName, motorLine.engineCode].filter(Boolean).join(" ") },
                  { label: "Комплектация", value: motorLine.configuration || "—" },
                  { label: "Коробка передач", value: motorEntity?.transmission?.trim() || "—" },
                  { label: "Стоимость", value: formatDocumentMoney(motorLine.unitPrice) },
                ]
              : [
                  { label: "Номер", value: motorLine.serialCode },
                  { label: "Модель", value: [motorLine.brandName, motorLine.engineCode].filter(Boolean).join(" ") },
                  { label: "Комплектация", value: motorLine.configuration || "—" },
                  { label: "Стоимость", value: formatDocumentMoney(motorLine.unitPrice) },
                ],
          });
        }
        break;
      case "transmission":
        if (motorEntity?.transmission?.trim()) {
          sections.push({
            key: "transmission",
            label: "Коробка передач",
            value: motorEntity.transmission,
          });
        }
        break;
      case "labor":
        if (laborRows.length > 0) {
          sections.push({ key: "labor", title: "Перечень работ", hint: "Сервисные операции", rows: laborRows });
        }
        break;
      case "parts":
        if (partRows.length > 0) {
          sections.push({
            key: "parts",
            title: "Запчасти и материалы",
            hint: company.name,
            rows: partRows,
          });
        }
        break;
      case "warranty":
        if (layout.showWarrantyTerms || slug === "engine-warranty" || profile.showEngineWarranty) {
          const resolvedWarranty = motorSale ? adaptWarrantyForMotorSale(warranty) : warranty;
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
                discount: order.pricing.discount > 0 ? `−${formatDocumentMoney(order.pricing.discount)}` : null,
                tax: null,
                grandTotal: formatDocumentMoney(order.pricing.grandTotal),
                warrantyNote: slug === "engine-warranty" ? (warrantyNote ?? meta.warrantyBlock ?? null) : null,
                recommendations: null,
              }
            : {
                labor: formatDocumentMoney(order.pricing.laborTotal),
                parts: formatDocumentMoney(order.pricing.partsTotal),
                engine: formatDocumentMoney(motorOnlyTotal),
                transmission: motorEntity?.transmission?.trim() || "—",
                discount: order.pricing.discount > 0 ? `−${formatDocumentMoney(order.pricing.discount)}` : null,
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
              ? "Продавец"
              : slug === "engine-waybill"
                ? "Передал (исполнитель)"
                : "Исполнитель",
            executorName,
            clientLabel: motorSale ? "Покупатель" : slug === "engine-waybill" ? "Получил (клиент)" : "Клиент",
            clientName: documentClientName(context),
          },
        });
        break;
      case "qr":
        if (qrDataUri) {
          const target = resolveDocumentQrTarget(slug, context, {
            companyQrLinkUrl: context.company.documentConfig?.qrLinkUrl,
          });
          sections.push({ key: "qr", qr: { dataUri: qrDataUri, targetUrl: target.url, label: target.label } });
        }
        break;
      default:
        break;
    }
  }

  if (layout.showUnifiedLineItems && enabledKeys.includes("totals" as never)) {
    const unified = buildUnifiedLineItems(context);
    if (unified.length > 0) {
      const idx = sections.findIndex((s) => s.key === "totals");
      const block: DocumentSectionModel = {
        key: "unified_lines",
        title: motorSale ? "Двигатель к оплате" : "Позиции к оплате",
        hint: motorSale ? "1 позиция" : `${unified.length} поз.`,
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
  const baseMeta = DOCUMENT_TEMPLATE_META[variant];
  const meta = motorSale ? motorSaleDocumentMeta(slug, baseMeta) : baseMeta;
  const layout = DOCUMENT_TEMPLATE_LAYOUT[variant];
  const theme = (context.theme ?? "modern") as DocumentTheme;
  const typography = documentTypography(theme);
  const { company } = context;

  const documentConfig = company.documentConfig ?? parseCompanyDocumentConfig({});
  const profile = classifyServiceOrder(context);
  const warranty = resolveWarrantyForDocument(company, documentConfig, {
    forEngine: profile.showEngineWarranty || motorSale,
    forWork: slug === "work-order" || slug === "service-act",
  });

  const enabledKeys = resolveEnabledSections(slug, layout, context, documentConfig.sections);

  const documentTag = layout.useOrderStatusTag
    ? (STATUS_LABELS[context.order.status] ?? meta.tag)
    : meta.tag;

  const footerText = documentConfig.documentFooter ?? meta.footer.replace(/AutoCore/g, company.name);
  const invoiceDays = documentConfig.invoiceValidityDays ?? 5;
  const disclaimerText =
    slug === "invoice" && meta.disclaimer
      ? meta.disclaimer.replace(/\d+\s+рабочих\s+дней?/i, `${invoiceDays} рабочих дней`)
      : meta.disclaimer;

  const resolvedWarranty = motorSale && slug === "engine-warranty" ? adaptWarrantyForMotorSale(warranty) : warranty;

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
      primaryValue: buildPrimaryValue(context, slug, resolvedWarranty.months, resolvedWarranty.km),
      primaryHint: null,
      executorName: documentAssigneeSummary(context),
    },
    header,
    brand: {
      name: company.name,
      shortName: company.shortName,
      legalName: company.legalName,
      slogan: company.slogan,
      address: company.address,
      phone: company.phone,
      email: company.email,
      website: company.website,
      logoDataUri: company.logoDataUri,
      primaryColor: company.primaryColor,
      secondaryColor: company.secondaryColor,
    },
    theme,
    typographyVars: typographyStyleVars(typography),
    brandStyle: companyBrandStyle(company, theme),
    themeClass: documentThemeClass(theme),
    pageClass: `doc-pdf-page--${variant}`,
    watermark: meta.title,
    documentWatermark: buildWatermarkRenderModel({
      config: watermarkConfig,
      logoDataUri: company.logoDataUri,
      companyName: company.shortName?.trim() || company.name,
    }),
    monogram: companyMonogram(company.name),
    sections: buildSections(context, slug, variant, enabledKeys, warranty, {
      qrDataUri,
      disclaimerText: disclaimerText ?? meta.disclaimer,
    }),
    enabledSectionKeys: enabledKeys,
    qrDataUri,
    racing:
      theme === "racing" && !motorSale
        ? buildRacingViewModel(context, { disclaimer: disclaimerText ?? meta.disclaimer })
        : undefined,
  };
}
