import { STATUS_LABELS } from "@/components/work-orders/work-order-copy";
import { DocumentTheme } from "@/domain/company-branding";
import {
  buildLaborLinesForDocument,
  buildPartLinesForDocument,
} from "@/lib/documents/classify-service-order";
import { companyBrandStyle, companyMonogram } from "@/lib/documents/company-brand";
import { DocumentContext } from "@/lib/documents/document-context";
import {
  ENGINE_WARRANTY_CONDITIONS,
  ENGINE_WARRANTY_KM,
  ENGINE_WARRANTY_MONTHS,
} from "@/lib/documents/document-copy";
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
import { addMonths, formatDocumentDate, formatDocumentMoney } from "@/lib/documents/format";
import {
  DOCUMENT_TEMPLATE_LAYOUT,
  DOCUMENT_TEMPLATE_META,
  DocumentTemplateVariant,
} from "@/lib/documents/templates/document-template-meta";
import { documentThemeClass } from "@/lib/documents/themes/tokens";
import { buildLogbookTimeline, classifyServiceOrder } from "@/lib/documents/work-order-insights";
import { cn } from "@/lib/utils";

type DocumentPdfTemplateProps = {
  context: DocumentContext;
  variant: DocumentTemplateVariant;
  qrDataUri?: string;
};

type TimelineStep = {
  label: string;
  date: string;
  mileage?: string;
  responsible: string;
};

type LineItemRow = {
  id: string;
  title: string;
  subtitle: string;
  quantity: string;
  amount: string;
};

function buildTimelineSteps(context: DocumentContext): TimelineStep[] {
  const profile = classifyServiceOrder(context);
  const logbook = buildLogbookTimeline(context, profile);
  const assignee = documentAssigneeSummary(context);
  const responsible = assignee !== "—" ? assignee : "AutoCore";

  return logbook.map((entry) => ({
    label: entry.title,
    date: entry.date,
    mileage: entry.mileage,
    responsible,
  }));
}

function buildWarrantyNote(
  context: DocumentContext,
  variant: DocumentTemplateVariant,
  fallback: string,
): string | null {
  if (variant === "engine-warranty") return null;

  const custom = context.company.warrantyText?.trim();
  if (custom) {
    return custom.split(/\n+/).filter(Boolean).join(" ");
  }

  const label = context.company.warrantyLabel?.trim();
  const profile = classifyServiceOrder(context);

  if (label) {
    if (profile.showEngineWarranty) {
      return `Гарантия на двигатель и работы по установке: ${label}. Действует при соблюдении регламента эксплуатации и своевременном техническом обслуживании.`;
    }
    return `Гарантия на выполненные работы: ${label}. Не распространяется на расходные материалы и естественный износ.`;
  }

  if (variant === "work-order") {
    if (profile.showEngineWarranty) {
      return `Гарантия на установленный двигатель и работы по монтажу — ${ENGINE_WARRANTY_MONTHS} месяцев или ${ENGINE_WARRANTY_KM.toLocaleString("ru-KZ")} км пробега (что наступит раньше). Первые 1 000 км — щадящий режим эксплуатации.`;
    }
    return "Гарантия на выполненные работы — 12 месяцев или 20 000 км пробега (что наступит раньше). На расходные материалы, фильтры и естественный износ гарантия не распространяется.";
  }

  return fallback || null;
}

function buildPrimaryValue(context: DocumentContext, variant: DocumentTemplateVariant): string {
  const { order } = context;
  const motor = documentPrimaryMotor(context);

  if (variant === "engine-warranty") {
    const until = addMonths(documentOrderDate(context), ENGINE_WARRANTY_MONTHS);
    return `${ENGINE_WARRANTY_MONTHS} мес · ${ENGINE_WARRANTY_KM.toLocaleString("ru-KZ")} км`;
  }

  if (variant === "engine-waybill" && motor) {
    return formatDocumentMoney(motor.unitPrice);
  }

  return formatDocumentMoney(order.pricing.grandTotal);
}

function buildPrimaryHint(context: DocumentContext, variant: DocumentTemplateVariant): string | null {
  if (variant === "engine-warranty") {
    const until = addMonths(documentOrderDate(context), ENGINE_WARRANTY_MONTHS);
    return `до ${formatDocumentDate(until)}`;
  }
  if (variant === "commercial-proposal") {
    return "до согласования состава работ";
  }
  return null;
}

function buildWarrantyTerms(context: DocumentContext): string[] {
  const custom = context.company.warrantyText?.trim();
  if (custom) return custom.split(/\n+/).filter(Boolean);
  return ENGINE_WARRANTY_CONDITIONS;
}

function buildRecommendations(context: DocumentContext): string | null {
  const comment = context.order.comment?.trim();
  return comment || null;
}

function buildEngineLabel(context: DocumentContext): string {
  const motor = documentPrimaryMotor(context);
  if (!motor) return "—";
  return [motor.brandName, motor.engineCode, motor.configuration].filter(Boolean).join(", ") || "—";
}

function buildUnifiedLineItems(context: DocumentContext): LineItemRow[] {
  const { order } = context;
  const rows: LineItemRow[] = [];

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
      subtitle: "Двигатель",
      quantity: "1",
      amount: formatDocumentMoney(line.unitPrice),
    });
  }

  return rows;
}

function resolveDocumentTag(context: DocumentContext, variant: DocumentTemplateVariant): string {
  const meta = DOCUMENT_TEMPLATE_META[variant];
  const layout = DOCUMENT_TEMPLATE_LAYOUT[variant];
  if (layout.useOrderStatusTag) {
    return STATUS_LABELS[context.order.status] ?? meta.tag;
  }
  return meta.tag;
}

function LineItemsBlock({
  title,
  hint,
  rows,
}: {
  title: string;
  hint: string;
  rows: LineItemRow[];
}) {
  if (rows.length === 0) return null;

  return (
    <section className="doc-pdf-section">
      <div className="doc-pdf-section-title">
        <h3>{title}</h3>
        <span>{hint}</span>
      </div>
      <div className="doc-pdf-table">
        <div className="doc-pdf-table-head">
          <span>#</span>
          <span>Наименование</span>
          <span>Кол-во</span>
          <span>Сумма</span>
        </div>
        <div className="doc-pdf-line-list">
          {rows.map((line, index) => (
            <div className="doc-pdf-line-item" key={line.id}>
              <div className="doc-pdf-li-index">{String(index + 1).padStart(2, "0")}</div>
              <div className="doc-pdf-li-main">
                <strong>{line.title}</strong>
                <span>{line.subtitle}</span>
              </div>
              <div className="doc-pdf-li-meta">{line.quantity}</div>
              <div className="doc-pdf-li-price">{line.amount}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function DocumentPdfTemplate({ context, variant, qrDataUri }: DocumentPdfTemplateProps) {
  const { company, order, client, vehicle } = context;
  const meta = DOCUMENT_TEMPLATE_META[variant];
  const layout = DOCUMENT_TEMPLATE_LAYOUT[variant];
  const theme = (context.theme ?? "modern") as DocumentTheme;
  const brandStyle = companyBrandStyle(company);
  const laborLines = buildLaborLinesForDocument(context);
  const partLines = buildPartLinesForDocument(context);
  const motorLine = documentPrimaryMotor(context);
  const motorEntity = documentPrimaryMotorEntity(context);
  const unifiedLines = buildUnifiedLineItems(context);

  const laborRows: LineItemRow[] = laborLines.map((line) => {
    const source = order.laborLines.find((item) => item.id === line.id);
    return {
      id: line.id,
      title: line.title,
      subtitle: line.subtitle || "Сервисная операция",
      quantity: source?.hours && source.hours > 0 ? `${source.hours} ч` : "1",
      amount: line.amount,
    };
  });

  const partRows: LineItemRow[] = [
    ...partLines.map((line) => {
      const source = order.partLines.find((part) => part.id === line.id);
      return {
        id: line.id,
        title: line.title,
        subtitle: source?.sku ? `Арт. ${source.sku}` : "Склад AutoCore",
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

  const timeline = buildTimelineSteps(context);
  const clientEmail = client?.email ?? "—";
  const mileage = order.mileage || vehicle?.currentMileage || 0;
  const partsTotal = order.pricing.partsTotal + order.pricing.motorsTotal;
  const warrantyNote = buildWarrantyNote(context, variant, meta.warrantyBlock);
  const recommendations = buildRecommendations(context);
  const executorName = documentAssigneeSummary(context);
  const documentDate = formatDocumentDate(documentOrderDate(context));
  const documentTag = resolveDocumentTag(context, variant);
  const primaryHint = buildPrimaryHint(context, variant);
  const warrantyTerms = buildWarrantyTerms(context);
  const plate = order.licensePlate || vehicle?.licensePlate;

  return (
    <main
      className={cn("doc-pdf-page", `doc-pdf-page--${variant}`, documentThemeClass(theme))}
      style={brandStyle}
    >
      <div className="doc-pdf-watermark" aria-hidden="true">
        {meta.title}
      </div>

      <header className="doc-pdf-header">
        <div className="doc-pdf-brand">
          {company.logoDataUri ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={company.logoDataUri} alt={company.name} className="doc-pdf-logo" />
          ) : (
            <div className="doc-pdf-monogram">{companyMonogram(company.name)}</div>
          )}
          <div className="doc-pdf-company">
            <h1>{company.name}</h1>
            {company.slogan ? <p className="doc-pdf-slogan">{company.slogan}</p> : null}
            {company.address ? <p>{company.address}</p> : null}
            <p>{[company.phone, company.email].filter(Boolean).join(" · ") || "—"}</p>
          </div>
        </div>
        <aside className="doc-pdf-docbox">
          <span className="doc-pdf-docbox-tag">{documentTag}</span>
          <h2>{meta.title}</h2>
          <strong>{context.orderLabel}</strong>
          <p>Дата: {documentDate}</p>
        </aside>
      </header>

      {layout.showMotorSpotlight && motorLine ? (
        <section className="doc-pdf-motor-spotlight">
          <div className="doc-pdf-motor-spotlight-label">Двигатель</div>
          <div className="doc-pdf-motor-spotlight-code">{motorLine.serialCode}</div>
          <p className="doc-pdf-motor-spotlight-meta">
            {[motorLine.brandName, motorLine.engineCode, motorLine.configuration].filter(Boolean).join(" · ")}
          </p>
          <div className="doc-pdf-motor-spotlight-grid">
            <div>
              <span>Автомобиль</span>
              <strong>{documentVehicleLabel(context)}</strong>
            </div>
            <div>
              <span>VIN</span>
              <strong>{order.vin || vehicle?.vin || "—"}</strong>
            </div>
            <div>
              <span>Операция</span>
              <strong>{motorLine.outcome === "install" ? "Установка" : "Продажа"}</strong>
            </div>
            <div>
              <span>Пробег ДВС</span>
              <strong>
                {motorEntity?.notes?.includes("км")
                  ? motorEntity.notes
                  : mileage
                    ? `${mileage.toLocaleString("ru-KZ")} км`
                    : "—"}
              </strong>
            </div>
          </div>
        </section>
      ) : null}

      {layout.showAcceptanceBanner ? (
        <div className="doc-pdf-acceptance">
          <span className="doc-pdf-acceptance-icon" aria-hidden="true">
            ✓
          </span>
          <p>{meta.disclaimer}</p>
        </div>
      ) : null}

      <section className={cn("doc-pdf-hero", layout.compactHero && "doc-pdf-hero-compact")}>
        <div className="doc-pdf-summary">
          <h3>{meta.title}</h3>
          <p>{meta.lead}</p>
        </div>
        <div className="doc-pdf-total-card">
          <span>{meta.primaryLabel}</span>
          <strong>{buildPrimaryValue(context, variant)}</strong>
          {primaryHint ? <small>{primaryHint}</small> : null}
          {!primaryHint ? <small>Исполнитель: {executorName}</small> : null}
        </div>
      </section>

      {layout.showClientVehicle ? (
        <section className="doc-pdf-grid-2">
          <div className="doc-pdf-section">
            <div className="doc-pdf-section-title">
              <h3>Клиент</h3>
              <span>{client?.id ?? order.clientId ?? "—"}</span>
            </div>
            <div className="doc-pdf-card">
              <div className="doc-pdf-fields">
                <div className="doc-pdf-field">
                  <span>ФИО</span>
                  <strong>{documentClientName(context)}</strong>
                </div>
                <div className="doc-pdf-field">
                  <span>Телефон</span>
                  <strong>{documentClientPhone(context)}</strong>
                </div>
                <div className="doc-pdf-field">
                  <span>Email</span>
                  <strong>{clientEmail}</strong>
                </div>
                <div className="doc-pdf-field">
                  <span>Примечание</span>
                  <strong>{client?.notes?.trim() || "—"}</strong>
                </div>
              </div>
            </div>
          </div>
          <div className="doc-pdf-section">
            <div className="doc-pdf-section-title">
              <h3>Автомобиль</h3>
              {plate ? <span className="doc-pdf-plate">{plate}</span> : <span>{vehicle?.id ?? "—"}</span>}
            </div>
            <div className="doc-pdf-card">
              <div className="doc-pdf-fields">
                <div className="doc-pdf-field">
                  <span>Марка / модель</span>
                  <strong>{documentVehicleLabel(context)}</strong>
                </div>
                <div className="doc-pdf-field">
                  <span>VIN</span>
                  <strong>{order.vin || vehicle?.vin || "—"}</strong>
                </div>
                <div className="doc-pdf-field">
                  <span>Пробег</span>
                  <strong>{mileage ? `${mileage.toLocaleString("ru-KZ")} км` : "—"}</strong>
                </div>
                <div className="doc-pdf-field">
                  <span>Двигатель</span>
                  <strong>{buildEngineLabel(context)}</strong>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {layout.showUnifiedLineItems ? (
        <LineItemsBlock title="Позиции к оплате" hint={`${unifiedLines.length} поз.`} rows={unifiedLines} />
      ) : null}

      {layout.showLabor ? (
        <LineItemsBlock title="Перечень работ" hint="Сервисные операции" rows={laborRows} />
      ) : null}

      {layout.showParts ? (
        <LineItemsBlock title="Запчасти и материалы" hint="Склад AutoCore" rows={partRows} />
      ) : null}

      {layout.showWarrantyTerms ? (
        <section className="doc-pdf-section doc-pdf-warranty-terms">
          <div className="doc-pdf-section-title">
            <h3>Условия гарантии</h3>
            <span>{ENGINE_WARRANTY_MONTHS} мес · {ENGINE_WARRANTY_KM.toLocaleString("ru-KZ")} км</span>
          </div>
          <div className="doc-pdf-warranty-grid">
            <div className="doc-pdf-warranty-pill">
              <span>Срок</span>
              <strong>{ENGINE_WARRANTY_MONTHS} месяцев</strong>
            </div>
            <div className="doc-pdf-warranty-pill">
              <span>Пробег</span>
              <strong>{ENGINE_WARRANTY_KM.toLocaleString("ru-KZ")} км</strong>
            </div>
            <div className="doc-pdf-warranty-pill">
              <span>До даты</span>
              <strong>{formatDocumentDate(addMonths(documentOrderDate(context), ENGINE_WARRANTY_MONTHS))}</strong>
            </div>
          </div>
          <ol className="doc-pdf-warranty-list">
            {warrantyTerms.map((term) => (
              <li key={term}>{term}</li>
            ))}
          </ol>
        </section>
      ) : null}

      {layout.showTimeline && timeline.length > 0 ? (
        <section className="doc-pdf-section">
          <div className="doc-pdf-section-title">
            <h3>Хронология</h3>
            <span>{timeline.length} {timeline.length === 1 ? "событие" : timeline.length < 5 ? "события" : "событий"}</span>
          </div>
          <div
            className="doc-pdf-timeline"
            style={{ gridTemplateColumns: `repeat(${timeline.length}, minmax(0, 1fr))` }}
          >
            {timeline.map((step, index) => (
              <div className="doc-pdf-step" key={`${step.label}-${step.date}-${index}`}>
                <div className="doc-pdf-dot">{index + 1}</div>
                <div>
                  <strong>{step.label}</strong>
                  <span>
                    {step.date}
                    {step.mileage ? ` · ${step.mileage}` : ""}
                    {" · "}
                    {step.responsible}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {layout.showMoneyTotals ? (
        <section className="doc-pdf-section doc-pdf-money">
          {warrantyNote || recommendations ? (
            <div className="doc-pdf-note">
              {warrantyNote ? (
                <>
                  <strong>Гарантия.</strong> {warrantyNote}
                </>
              ) : null}
              {warrantyNote && recommendations ? <br /> : null}
              {recommendations ? (
                <>
                  <strong>Рекомендации мастера.</strong> {recommendations}
                </>
              ) : null}
            </div>
          ) : (
            <div className="doc-pdf-note doc-pdf-note-muted">Итоговая сумма по заказ-наряду.</div>
          )}
          <div className="doc-pdf-totals">
            <div>
              <span>Работы</span>
              <strong>{formatDocumentMoney(order.pricing.laborTotal)}</strong>
            </div>
            <div>
              <span>Запчасти</span>
              <strong>{formatDocumentMoney(partsTotal)}</strong>
            </div>
            {order.pricing.discount > 0 ? (
              <div>
                <span>Скидка</span>
                <strong>−{formatDocumentMoney(order.pricing.discount)}</strong>
              </div>
            ) : null}
            <div>
              <span>Итого</span>
              <strong>{formatDocumentMoney(order.pricing.grandTotal)}</strong>
            </div>
          </div>
        </section>
      ) : null}

      {layout.showDisclaimer && !layout.showAcceptanceBanner && meta.disclaimer ? (
        <div className="doc-pdf-disclaimer">{meta.disclaimer}</div>
      ) : null}

      <section className={cn("doc-pdf-bottom", !qrDataUri && "doc-pdf-bottom-no-qr")}>
        <div className="doc-pdf-signatures">
          <div className="doc-pdf-signature">
            <span>{variant === "engine-waybill" ? "Передал (исполнитель)" : "Исполнитель"}</span>
            <b>{executorName}</b>
            <i>подпись</i>
          </div>
          <div className="doc-pdf-signature">
            <span>{variant === "engine-waybill" ? "Получил (клиент)" : "Клиент"}</span>
            <b>{documentClientName(context)}</b>
            <i>подпись</i>
          </div>
        </div>
        {qrDataUri ? (
          <div className="doc-pdf-qr">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUri} alt="" />
          </div>
        ) : null}
      </section>

      <footer className="doc-pdf-footer">
        <span>{meta.footer}</span>
        <span>{context.orderLabel}</span>
      </footer>
    </main>
  );
}
