import { DocumentPdfRacingRenderer } from "@/components/documents/engine/document-pdf-racing-renderer";
import { companyMonogram } from "@/lib/documents/company-brand";
import {
  DocumentLineItem,
  DocumentRenderModel,
  DocumentSectionModel,
  DocumentTimelineEvent,
  DocumentTotalsBlock,
} from "@/lib/documents/render-model/types";
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
}: {
  title: string;
  hint: string;
  rows: DocumentLineItem[];
}) {
  if (rows.length === 0) return null;
  return (
    <section className="doc-pdf-block">
      <BlockHead title={title} hint={hint} />
      <table className="doc-pdf-table">
        <thead>
          <tr>
            <th className="doc-pdf-col-no">#</th>
            <th className="doc-pdf-col-name">Наименование</th>
            <th className="doc-pdf-col-qty">Кол-во</th>
            <th className="doc-pdf-col-sum">Сумма</th>
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

function TimelineList({ title, events }: { title: string; events: DocumentTimelineEvent[] }) {
  if (events.length === 0) return null;
  return (
    <section className="doc-pdf-block">
      <BlockHead
        title={title}
        hint={`${events.length} ${events.length === 1 ? "событие" : events.length < 5 ? "события" : "событий"}`}
      />
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
}: {
  totals: DocumentTotalsBlock;
  note?: { warranty?: string | null; recommendations?: string | null };
}) {
  const rows = [
    { label: "Работы", value: totals.labor },
    { label: "Запчасти", value: totals.parts },
    { label: "Двигатель", value: totals.engine },
    totals.transmission !== "—" ? { label: "КПП", value: totals.transmission } : null,
    totals.discount ? { label: "Скидка", value: totals.discount } : null,
    totals.tax ? { label: "Налог", value: totals.tax } : null,
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <section className="doc-pdf-block doc-pdf-block--totals">
      <BlockHead title="Итоговая сумма" />
      {note?.warranty || note?.recommendations ? (
        <div className="doc-pdf-callout">
          {note.warranty ? (
            <p>
              <strong>Гарантия.</strong> {note.warranty}
            </p>
          ) : null}
          {note.recommendations ? (
            <p>
              <strong>Рекомендации.</strong> {note.recommendations}
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
          <span className="doc-pdf-totals-label">Итого</span>
          <span className="doc-pdf-totals-value">{totals.grandTotal}</span>
        </div>
      </div>
    </section>
  );
}

function renderSection(section: DocumentSectionModel) {
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
              <p className="doc-pdf-hero-meta">Исполнитель: {section.meta.executorName}</p>
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
            <span>Двигатель</span>
            <strong>{section.serialCode}</strong>
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
          <BlockHead title="Участники" />
          <div className="doc-pdf-split">
            <DataCard title="Клиент" fields={section.client} />
            <DataCard title="Автомобиль" badge={section.plate} fields={section.vehicle} />
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
      return <LineItemsTable key="labor" title={section.title} hint={section.hint} rows={section.rows} />;
    case "parts":
      return <LineItemsTable key="parts" title={section.title} hint={section.hint} rows={section.rows} />;
    case "unified_lines":
      return (
        <LineItemsTable key="unified_lines" title={section.title} hint={section.hint} rows={section.rows} />
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
          {section.warranty.months > 0 ? (
            <div className="doc-pdf-warranty-stats">
              <div>
                <span>Срок</span>
                <strong>{section.warranty.months} мес.</strong>
              </div>
              <div>
                <span>Пробег</span>
                <strong>{section.warranty.km.toLocaleString("ru-KZ")} км</strong>
              </div>
              <div>
                <span>До даты</span>
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
      return <TimelineList key="vehicle_history" title="История автомобиля" events={section.events} />;
    case "aggregate_history":
      return <TimelineList key="aggregate_history" title="История агрегата" events={section.events} />;
    case "photos":
      return (
        <section className="doc-pdf-block" key="photos">
          <BlockHead title="Фотофиксация" hint={`${section.items.length} фото`} />
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
          <BlockHead title="Диагностика" />
          <p className="doc-pdf-prose">{section.text}</p>
        </section>
      );
    case "recommendations":
      return (
        <section className="doc-pdf-block" key="recommendations">
          <BlockHead title="Рекомендации" />
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

  const { brand, meta } = model;
  const signatureSection = model.sections.find((s) => s.key === "signatures");
  const qrSection = model.sections.find((s) => s.key === "qr");

  return (
    <main
      className={cn("doc-pdf-page", model.pageClass, model.themeClass)}
      style={{ ...model.brandStyle, ...model.typographyVars }}
    >
      <header className="doc-pdf-header">
        <div className="doc-pdf-brand">
          {brand.logoDataUri ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={brand.logoDataUri} alt={brand.name} className="doc-pdf-logo" />
          ) : (
            <div className="doc-pdf-monogram">{model.monogram}</div>
          )}
          <div className="doc-pdf-brand-text">
            <h1>{brand.name}</h1>
            {brand.slogan ? <p className="doc-pdf-slogan">{brand.slogan}</p> : null}
            {brand.address ? <p>{brand.address}</p> : null}
            <p>{[brand.phone, brand.email, brand.website].filter(Boolean).join(" · ") || "—"}</p>
          </div>
        </div>
        <div className="doc-pdf-meta">
          <span className="doc-pdf-meta-tag">{meta.tag}</span>
          <h2>{meta.title}</h2>
          <dl className="doc-pdf-meta-list">
            <div>
              <dt>Номер</dt>
              <dd>{meta.orderLabel}</dd>
            </div>
            <div>
              <dt>Дата</dt>
              <dd>{meta.documentDate}</dd>
            </div>
          </dl>
        </div>
      </header>

      <div className="doc-pdf-body">{model.sections.map((section) => renderSection(section))}</div>

      <footer className="doc-pdf-footer-block">
        <div className={cn("doc-pdf-footer-grid", !qrSection && "doc-pdf-footer-grid--no-qr")}>
          {signatureSection?.key === "signatures" ? (
            <div className="doc-pdf-signatures">
              <div className="doc-pdf-sign">
                <span>{signatureSection.signatures.executorLabel}</span>
                <b>{signatureSection.signatures.executorName}</b>
                <div className="doc-pdf-sign-line">подпись</div>
              </div>
              <div className="doc-pdf-sign">
                <span>{signatureSection.signatures.clientLabel}</span>
                <b>{signatureSection.signatures.clientName}</b>
                <div className="doc-pdf-sign-line">подпись</div>
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
          <span>{meta.footer}</span>
          <span>{meta.orderLabel}</span>
        </div>
      </footer>
    </main>
  );
}
