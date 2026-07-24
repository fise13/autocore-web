import { DocumentPdfHeader } from "@/components/documents/header/document-pdf-header";
import { DocumentPdfRacingRenderer } from "@/components/documents/engine/document-pdf-racing-renderer";
import { DocumentWatermarkLayer } from "@/components/documents/watermark/document-watermark-layer";
import {
  DocumentLineItem,
  DocumentRenderModel,
  DocumentSectionModel,
  DocumentTimelineEvent,
  DocumentTotalsBlock,
} from "@/lib/documents/render-model/types";
import type { DocumentUiLabels } from "@/lib/documents/document-context";
import { cn } from "@/lib/utils";

function BlockHead({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="doc-pdf-block-head">
      <h3>{title}</h3>
      {hint ? <span>{hint}</span> : null}
    </div>
  );
}

function LineItemsTable({
  title,
  hint,
  rows,
  ui,
}: {
  title: string;
  hint: string;
  rows: DocumentLineItem[];
  ui: DocumentUiLabels;
}) {
  if (rows.length === 0) return null;
  return (
    <section className="doc-pdf-block">
      <BlockHead title={title} hint={hint} />
      <table className="doc-pdf-table">
        <thead>
          <tr>
            <th className="doc-pdf-col-no">#</th>
            <th className="doc-pdf-col-name">{ui.name}</th>
            <th className="doc-pdf-col-qty">{ui.qty}</th>
            <th className="doc-pdf-col-sum">{ui.amount}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((line, index) => (
            <tr key={line.id}>
              <td className="doc-pdf-col-no">{String(index + 1).padStart(2, "0")}</td>
              <td className="doc-pdf-col-name">
                <strong>{line.title}</strong>
                <span>{line.subtitle}</span>
              </td>
              <td className="doc-pdf-col-qty">{line.quantity}</td>
              <td className="doc-pdf-col-sum">{line.amount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function DataCard({
  title,
  badge,
  fields,
}: {
  title: string;
  badge?: string;
  fields: { label: string; value: string }[];
}) {
  return (
    <div className="doc-pdf-data-card">
      <div className="doc-pdf-data-card-head">
        <h4>{title}</h4>
        {badge ? <span className="doc-pdf-badge">{badge}</span> : null}
      </div>
      <dl className="doc-pdf-kv-list">
        {fields.map((field) => (
          <div className="doc-pdf-kv" key={field.label}>
            <dt>{field.label}</dt>
            <dd>{field.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function eventCountLabel(count: number, ui: DocumentUiLabels): string {
  if (count === 1) return ui.eventOne;
  if (count < 5) return ui.eventFew;
  return ui.eventMany;
}

function TimelineList({
  title,
  events,
  ui,
}: {
  title: string;
  events: DocumentTimelineEvent[];
  ui: DocumentUiLabels;
}) {
  if (events.length === 0) return null;
  return (
    <section className="doc-pdf-block">
      <BlockHead title={title} hint={`${events.length} ${eventCountLabel(events.length, ui)}`} />
      <ol className="doc-pdf-timeline-list">
        {events.map((step, index) => (
          <li className="doc-pdf-timeline-item" key={step.id}>
            <div className="doc-pdf-timeline-marker">{index + 1}</div>
            <div className="doc-pdf-timeline-body">
              <strong>{step.label}</strong>
              <span>
                {step.date}
                {step.mileage ? ` · ${step.mileage}` : ""}
                {" · "}
                {step.responsible}
              </span>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function TotalsSheet({
  totals,
  note,
  ui,
}: {
  totals: DocumentTotalsBlock;
  note?: { warranty?: string | null; recommendations?: string | null };
  ui: DocumentUiLabels;
}) {
  const rows = [
    totals.labor ? { label: ui.labor, value: totals.labor } : null,
    totals.parts ? { label: ui.parts, value: totals.parts } : null,
    totals.engine
      ? {
          label: totals.labor || totals.parts ? ui.engine : ui.engineCost,
          value: totals.engine,
        }
      : null,
    totals.transmission && totals.transmission !== "—"
      ? { label: ui.transmission, value: totals.transmission }
      : null,
    totals.discount ? { label: ui.discount, value: totals.discount } : null,
    totals.tax ? { label: ui.tax, value: totals.tax } : null,
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <section className="doc-pdf-block doc-pdf-block--totals">
      <BlockHead title={ui.totalsTitle} />
      {note?.warranty || note?.recommendations ? (
        <div className="doc-pdf-callout">
          {note.warranty ? (
            <p>
              <strong>{ui.warranty}</strong> {note.warranty}
            </p>
          ) : null}
          {note.recommendations ? (
            <p>
              <strong>{ui.recommendations}</strong> {note.recommendations}
            </p>
          ) : null}
        </div>
      ) : null}
      <div className="doc-pdf-totals-sheet">
        {rows.map((row) => (
          <div className="doc-pdf-totals-row" key={row.label}>
            <span className="doc-pdf-totals-label">{row.label}</span>
            <span className="doc-pdf-totals-value">{row.value}</span>
          </div>
        ))}
        <div className="doc-pdf-totals-row doc-pdf-totals-row--grand">
          <span className="doc-pdf-totals-label">{ui.grandTotal}</span>
          <span className="doc-pdf-totals-value">{totals.grandTotal}</span>
        </div>
      </div>
    </section>
  );
}

function renderSection(section: DocumentSectionModel, ui: DocumentUiLabels) {
  switch (section.key) {
    case "hero":
      return (
        <section className="doc-pdf-hero-band" key="hero">
          <div className="doc-pdf-hero-copy">
            <p className="doc-pdf-hero-eyebrow">{section.meta.primaryLabel}</p>
            <h2>{section.meta.title}</h2>
            <p>{section.meta.lead}</p>
            {section.meta.primaryHint ? (
              <p className="doc-pdf-hero-meta">{section.meta.primaryHint}</p>
            ) : (
              <p className="doc-pdf-hero-meta">
                {ui.executor} {section.meta.executorName}
              </p>
            )}
          </div>
          <div className="doc-pdf-hero-amount">
            <span>{section.meta.primaryLabel}</span>
            <strong>{section.meta.primaryValue}</strong>
          </div>
        </section>
      );
    case "acceptance":
      return (
        <div className="doc-pdf-banner doc-pdf-banner--success" key="acceptance">
          <span aria-hidden="true">✓</span>
          <p>{section.text}</p>
        </div>
      );
    case "motor_spotlight":
      return (
        <section className="doc-pdf-block doc-pdf-block--motor" key="motor_spotlight">
          <div className="doc-pdf-motor-head">
            <span>{ui.engine}</span>
            <strong>{section.displayName}</strong>
          </div>
          <p className="doc-pdf-motor-sub">{section.meta}</p>
          <div className="doc-pdf-motor-grid">
            {section.fields.map((field) => (
              <div className="doc-pdf-motor-field" key={field.label}>
                <span>{field.label}</span>
                <strong>{field.value}</strong>
              </div>
            ))}
          </div>
        </section>
      );
    case "vehicle":
      return (
        <section className="doc-pdf-block" key="vehicle">
          <BlockHead title={section.sectionTitle ?? ui.participants} />
          <div className="doc-pdf-split">
            <DataCard title={section.clientCardTitle ?? ui.client} fields={section.client} />
            <DataCard
              title={section.detailsCardTitle ?? ui.vehicle}
              badge={section.plate}
              fields={section.vehicle}
            />
          </div>
        </section>
      );
    case "engine":
      return (
        <section className="doc-pdf-block" key="engine">
          <BlockHead title={section.label} />
          <dl className="doc-pdf-kv-grid">
            {section.fields.map((field) => (
              <div className="doc-pdf-kv" key={field.label}>
                <dt>{field.label}</dt>
                <dd>{field.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      );
    case "transmission":
      return (
        <section className="doc-pdf-block" key="transmission">
          <BlockHead title={section.label} />
          <p className="doc-pdf-prose">{section.value}</p>
        </section>
      );
    case "labor":
      return (
        <LineItemsTable key="labor" title={section.title} hint={section.hint} rows={section.rows} ui={ui} />
      );
    case "parts":
      return (
        <LineItemsTable key="parts" title={section.title} hint={section.hint} rows={section.rows} ui={ui} />
      );
    case "unified_lines":
      return (
        <LineItemsTable
          key="unified_lines"
          title={section.title}
          hint={section.hint}
          rows={section.rows}
          ui={ui}
        />
      );
    case "warranty":
      return (
        <section className="doc-pdf-block doc-pdf-block--warranty" key="warranty">
          <div className="doc-pdf-block-head">
            <h3>{section.warranty.headline}</h3>
            <span className="doc-pdf-status" style={{ color: section.warranty.statusColor }}>
              {section.warranty.statusLabel}
            </span>
          </div>
          {section.warranty.days > 0 ? (
            <div className="doc-pdf-warranty-stats">
              <div>
                <span>{ui.term}</span>
                <strong>
                  {section.warranty.days} {ui.daysShort}
                </strong>
              </div>
              <div>
                <span>{ui.mileage}</span>
                <strong>{section.warranty.km.toLocaleString("ru-KZ")} {"\u043a\u043c"}</strong>
              </div>
              <div>
                <span>{ui.untilDate}</span>
                <strong>{section.expiresAt}</strong>
              </div>
            </div>
          ) : null}
          <ol className="doc-pdf-terms">
            {section.warranty.conditions.map((term) => (
              <li key={term}>{term}</li>
            ))}
          </ol>
        </section>
      );
    case "vehicle_history":
      return (
        <TimelineList key="vehicle_history" title={ui.vehicleHistory} events={section.events} ui={ui} />
      );
    case "aggregate_history":
      return (
        <TimelineList
          key="aggregate_history"
          title={ui.aggregateHistory}
          events={section.events}
          ui={ui}
        />
      );
    case "photos":
      return (
        <section className="doc-pdf-block" key="photos">
          <BlockHead title={ui.photos} hint={`${section.items.length} ${ui.photoCount}`} />
          <div className="doc-pdf-photo-grid">
            {section.items.map((photo) => (
              <figure key={photo.id} className="doc-pdf-photo">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.url} alt={photo.caption} />
                <figcaption>{photo.caption}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      );
    case "diagnostics":
      return (
        <section className="doc-pdf-block" key="diagnostics">
          <BlockHead title={ui.diagnostics} />
          <p className="doc-pdf-prose">{section.text}</p>
        </section>
      );
    case "recommendations":
      return (
        <section className="doc-pdf-block" key="recommendations">
          <BlockHead title={ui.recommendationsTitle} />
          <p className="doc-pdf-prose">{section.text}</p>
        </section>
      );
    case "totals":
      return (
        <TotalsSheet
          key="totals"
          totals={section.totals}
          note={{
            warranty: section.totals.warrantyNote,
            recommendations: section.totals.recommendations,
          }}
          ui={ui}
        />
      );
    case "disclaimer":
      return (
        <div className="doc-pdf-banner doc-pdf-banner--muted" key="disclaimer">
          <p>{section.text}</p>
        </div>
      );
    case "signatures":
    case "qr":
      return null;
    default:
      return null;
  }
}

export function DocumentPdfRenderer({ model }: { model: DocumentRenderModel }) {
  if (model.theme === "racing" && model.racing) {
    return <DocumentPdfRacingRenderer model={model} />;
  }

  const ui = model.ui;
  const signatureSection = model.sections.find((s) => s.key === "signatures");
  const qrSection = model.sections.find((s) => s.key === "qr");

  return (
    <main
      className={cn(
        "doc-pdf-page",
        model.pageClass,
        model.themeClass,
        model.documentWatermark && `doc-pdf-page--wm-${model.documentWatermark.type}`,
      )}
      style={{ ...model.brandStyle, ...model.themeStyleVars, ...model.typographyVars, ...model.header.style }}
    >
      {model.documentWatermark ? <DocumentWatermarkLayer watermark={model.documentWatermark} /> : null}

      <div className="doc-pdf-page__surface">
        <DocumentPdfHeader header={model.header} ui={ui} />

        <div className="doc-pdf-body">{model.sections.map((section) => renderSection(section, ui))}</div>

        <footer className="doc-pdf-footer-block">
          <div className={cn("doc-pdf-footer-grid", !qrSection && "doc-pdf-footer-grid--no-qr")}>
            {signatureSection?.key === "signatures" ? (
              <div className="doc-pdf-signatures">
                <div className="doc-pdf-sign">
                  <span>{signatureSection.signatures.executorLabel}</span>
                  <b>{signatureSection.signatures.executorName}</b>
                  <div className="doc-pdf-sign-line">{ui.signature}</div>
                </div>
                <div className="doc-pdf-sign">
                  <span>{signatureSection.signatures.clientLabel}</span>
                  <b>{signatureSection.signatures.clientName}</b>
                  <div className="doc-pdf-sign-line">{ui.signature}</div>
                </div>
              </div>
            ) : null}
            {qrSection?.key === "qr" ? (
              <div className="doc-pdf-qr">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrSection.qr.dataUri} alt="" />
                <span>{qrSection.qr.label}</span>
              </div>
            ) : null}
          </div>
          <div className="doc-pdf-footer">
            <span>{model.meta.footer}</span>
            <span>{model.meta.orderLabel}</span>
          </div>
        </footer>
      </div>
    </main>
  );
}
