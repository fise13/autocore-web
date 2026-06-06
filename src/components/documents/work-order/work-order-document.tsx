"use client";

import { splitBrandingParagraphs } from "@/domain/company-branding";
import {
  buildBreakInNotes,
  buildDiagnosticNotes,
  buildLaborLinesForDocument,
  buildPartLinesForDocument,
  classifyServiceOrder,
  hasGearboxWork,
} from "@/lib/documents/classify-service-order";
import { DocumentContext } from "@/lib/documents/document-context";
import { companyBrandStyle, companyContactLine } from "@/lib/documents/company-brand";
import {
  documentAssigneeSummary,
  documentClientName,
  documentPrimaryMotor,
} from "@/lib/documents/document-helpers";
import { formatDocumentDate, formatDocumentMoney } from "@/lib/documents/format";
import {
  buildLogbookTimeline,
  buildNextServiceInsight,
  buildWarrantyInsight,
  documentEngineMileage,
  documentIntakeDate,
  documentNextMilestone,
  documentReleaseDate,
  documentVehicleTitle,
} from "@/lib/documents/work-order-insights";

import { DocumentPage } from "../shared/document-page";
import { workOrderDocumentNumber } from "./work-order-status-badge";

type WorkOrderDocumentProps = {
  context: DocumentContext;
  qrDataUri?: string;
};

function CheckeredRule() {
  return <div className="doc-sr-rule" aria-hidden="true" />;
}

export function WorkOrderDocument({ context }: WorkOrderDocumentProps) {
  const { order, company } = context;
  const profile = classifyServiceOrder(context);
  const motorLine = documentPrimaryMotor(context);
  const motorWarranty = profile.showEngineWarranty ? buildWarrantyInsight(context) : null;
  const nextService = profile.showOilInterval ? buildNextServiceInsight(context) : null;
  const laborLines = buildLaborLinesForDocument(context);
  const partLines = buildPartLinesForDocument(context);
  const logbook = buildLogbookTimeline(context, profile);
  const diagnosticNotes = profile.showDiagnosticsNotes ? buildDiagnosticNotes(context) : [];
  const breakInNotes = profile.showBreakInNotes ? buildBreakInNotes() : [];
  const mileage = order.mileage || 0;
  const milestone = mileage > 0 ? documentNextMilestone(mileage) : null;
  const orderNumber = workOrderDocumentNumber(order);
  const brandStyle = companyBrandStyle(company);
  const orderDate = formatDocumentDate(documentIntakeDate(context));
  const serviceDate = formatDocumentDate(documentReleaseDate(context));
  const hasDiscount = order.pricing.discount > 0;
  const subtotalBeforeDiscount =
    order.pricing.laborTotal + order.pricing.partsTotal + order.pricing.motorsTotal;

  const warrantyLabel =
    company.warrantyLabel?.trim() ||
    (motorWarranty ? `${motorWarranty.months} мес · ${motorWarranty.km.toLocaleString("ru-KZ")} км` : "");
  const warrantyTerms = splitBrandingParagraphs(company.warrantyText);
  const showWarrantyBlock = Boolean(
    motorWarranty || warrantyLabel || warrantyTerms.length > 0,
  );
  const executorName = documentAssigneeSummary(context) || company.name;
  const showMilestone = mileage > 0 && profile.kind !== "diagnostics";

  return (
    <DocumentPage className="doc-sr-page" style={brandStyle}>
      <header className="doc-sr-top">
        <div className="doc-sr-brand">
          {company.logoDataUri ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={company.logoDataUri} alt="" className="doc-sr-brand-logo" />
          ) : (
            <span className="doc-sr-brand-name">{company.name}</span>
          )}
        </div>
        <div className="doc-sr-head">
          <div className="doc-sr-head-meta">
            <span>№{orderNumber > 0 ? orderNumber : "—"}</span>
            <span className="doc-sr-head-dot">·</span>
            <span>{serviceDate}</span>
          </div>
          {order.licensePlate ? <div className="doc-sr-plate">{order.licensePlate}</div> : null}
        </div>
      </header>

      <section className="doc-sr-vehicle-block">
        <h1 className="doc-sr-vehicle">{documentVehicleTitle(context)}</h1>
        {order.vin ? <p className="doc-sr-vin">{order.vin}</p> : null}
        <dl className="doc-sr-vehicle-meta">
          <div>
            <dt className="doc-sr-label">Клиент</dt>
            <dd>{documentClientName(context)}</dd>
          </div>
          <div>
            <dt className="doc-sr-label">Пробег</dt>
            <dd>{mileage ? `${mileage.toLocaleString("ru-KZ")} км` : "—"}</dd>
          </div>
          <div>
            <dt className="doc-sr-label">Дата заказа</dt>
            <dd>{orderDate}</dd>
          </div>
        </dl>
      </section>

      <CheckeredRule />

      {showMilestone && milestone ? (
        <section className="doc-sr-milestone">
          <div className="doc-sr-milestone-head">
            <span className="doc-sr-label">Следующий рубеж</span>
            <span className="doc-sr-milestone-target">{milestone.target.toLocaleString("ru-KZ")} км</span>
          </div>
          <div className="doc-sr-milestone-track">
            <span style={{ width: `${Math.max(milestone.progressPercent, 2)}%` }} />
          </div>
          <p className="doc-sr-milestone-note">ещё {milestone.kmRemaining.toLocaleString("ru-KZ")} км</p>
        </section>
      ) : null}

      <section className={`doc-sr-stats ${nextService ? "" : "doc-sr-stats-compact"}`}>
        <div className="doc-sr-stat">
          <span className="doc-sr-label">Пробег</span>
          <strong>{mileage ? `${mileage.toLocaleString("ru-KZ")}` : "—"}</strong>
        </div>
        <div className="doc-sr-stat doc-sr-stat-total">
          <span className="doc-sr-label">Сумма</span>
          <strong>{formatDocumentMoney(order.pricing.grandTotal)}</strong>
          {warrantyLabel && profile.showEngineWarranty ? (
            <span className="doc-sr-stat-note">{warrantyLabel}</span>
          ) : null}
        </div>
        {nextService ? (
          <div className="doc-sr-stat doc-sr-stat-next">
            <span className="doc-sr-label">Следующая замена</span>
            <strong>{nextService.dueMileage.toLocaleString("ru-KZ")} км</strong>
            <span className="doc-sr-stat-note">{formatDocumentDate(nextService.dueDate)}</span>
          </div>
        ) : null}
      </section>

      <CheckeredRule />

      {laborLines.length > 0 ? (
        <section className="doc-sr-section">
          <h2 className="doc-sr-section-title">Выполненная работа</h2>
          <ul className="doc-sr-lines">
            {laborLines.map((item) => (
              <li key={item.id}>
                <span>
                  {item.title}
                  {item.subtitle ? <small className="doc-sr-line-sub">{item.subtitle}</small> : null}
                </span>
                <span>{item.amount}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {profile.showPartsBlock ? (
        <section className="doc-sr-section">
          <h2 className="doc-sr-section-title">Установленные детали</h2>
          <ul className="doc-sr-lines">
            {partLines.map((item) => (
              <li key={item.id}>
                <span>{item.title}</span>
                <span>{item.amount}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {profile.showEngineBlock && motorLine ? (
        <section className="doc-sr-section doc-sr-engine">
          <h2 className="doc-sr-section-title">Двигатель</h2>
          <p className="doc-sr-engine-id">{motorLine.serialCode}</p>
          <p className="doc-sr-engine-meta">
            {[motorLine.brandName, motorLine.engineCode, motorLine.configuration].filter(Boolean).join(" · ")}
          </p>
          <p className="doc-sr-engine-meta">Пробег двигателя · {documentEngineMileage(context)}</p>
        </section>
      ) : null}

      {hasGearboxWork(context) ? (
        <section className="doc-sr-section">
          <h2 className="doc-sr-section-title">Коробка передач</h2>
          <p className="doc-sr-engine-meta">Обслуживание зафиксировано в перечне работ</p>
        </section>
      ) : null}

      {diagnosticNotes.length > 0 ? (
        <section className="doc-sr-section">
          <h2 className="doc-sr-section-title">Результаты проверки</h2>
          <ul className="doc-sr-notes">
            {diagnosticNotes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {breakInNotes.length > 0 ? (
        <section className="doc-sr-section">
          <h2 className="doc-sr-section-title">Рекомендации</h2>
          <ul className="doc-sr-notes">
            {breakInNotes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="doc-sr-section doc-sr-logbook-featured">
        <h2 className="doc-sr-section-title">Бортжурнал автомобиля</h2>
        <ol className="doc-sr-logbook">
          {logbook.map((entry) => (
            <li className={`doc-sr-logbook-item doc-sr-logbook-${entry.state}`} key={entry.id}>
              <div className="doc-sr-logbook-date">
                <span>{entry.date}</span>
                {entry.mileage ? <span>{entry.mileage}</span> : null}
              </div>
              <div className="doc-sr-logbook-rail">
                <span className="doc-sr-logbook-dot" />
              </div>
              <p className="doc-sr-logbook-title">{entry.title}</p>
            </li>
          ))}
        </ol>
      </section>

      <CheckeredRule />

      <section className="doc-sr-grand">
        {hasDiscount ? (
          <p className="doc-sr-grand-before">
            <span>{formatDocumentMoney(subtotalBeforeDiscount)}</span>
          </p>
        ) : null}
        <p className="doc-sr-grand-amount">{formatDocumentMoney(order.pricing.grandTotal)}</p>
      </section>

      {showWarrantyBlock ? (
        <section className="doc-sr-warranty-box">
          <div className="doc-sr-warranty-box-left">
            {warrantyLabel ? <p className="doc-sr-warranty-headline">{warrantyLabel}</p> : null}
            {motorWarranty ? (
              <p className="doc-sr-warranty-until">до {formatDocumentDate(motorWarranty.untilDate)}</p>
            ) : null}
            {motorWarranty ? (
              <p className="doc-sr-warranty-until">
                до {motorWarranty.untilMileage.toLocaleString("ru-KZ")} км
              </p>
            ) : null}
          </div>
          {warrantyTerms.length > 0 ? (
            <div className="doc-sr-warranty-box-right">
              {warrantyTerms.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      <footer className="doc-sr-signatures">
        <div className="doc-sr-signature">
          <p className="doc-sr-signature-name">{executorName}</p>
          <div className="doc-sr-signature-line" />
          <p className="doc-sr-signature-role">Исполнитель</p>
        </div>
        <div className="doc-sr-signature">
          <p className="doc-sr-signature-name">{documentClientName(context)}</p>
          <div className="doc-sr-signature-line" />
          <p className="doc-sr-signature-role">Клиент</p>
        </div>
      </footer>

      <CheckeredRule />

      <div className="doc-sr-foot">
        <div className="doc-sr-foot-brand">
          {company.logoDataUri ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={company.logoDataUri} alt="" className="doc-sr-foot-logo" />
          ) : (
            <span>{company.name}</span>
          )}
        </div>
        <div className="doc-sr-foot-contacts">
          {company.website ? <span>{company.website.replace(/^https?:\/\//, "")}</span> : null}
          {company.socialHandle ? (
            <span>{company.socialHandle.startsWith("@") ? company.socialHandle : `@${company.socialHandle}`}</span>
          ) : null}
          {!company.website && !company.socialHandle && companyContactLine(company) ? (
            <span>{companyContactLine(company)}</span>
          ) : null}
        </div>
      </div>
    </DocumentPage>
  );
}
