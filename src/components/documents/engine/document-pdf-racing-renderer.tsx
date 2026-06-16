import { DocumentPdfHeader } from "@/components/documents/header/document-pdf-header";
import { DocumentWatermarkLayer } from "@/components/documents/watermark/document-watermark-layer";
import { DocumentRenderModel } from "@/lib/documents/render-model/types";
import { RacingViewModel } from "@/lib/documents/render-model/build-racing-view-model";
import { cn } from "@/lib/utils";

function CheckeredBar() {
  return <div className="doc-racing-checkered" aria-hidden="true" />;
}

function PitStopList({
  laborRows,
  partRows,
}: {
  laborRows: RacingViewModel["laborRows"];
  partRows: RacingViewModel["partRows"];
}) {
  const hasLabor = laborRows.length > 0;
  const hasParts = partRows.length > 0;

  if (!hasLabor && !hasParts) {
    return <p className="doc-racing-empty">Пит-стоп без работ</p>;
  }

  return (
    <>
      {hasLabor ? (
        <ul className="doc-racing-pit-list">
          {laborRows.map((row) => (
            <li key={row.id}>
              <span>{row.title}</span>
              <strong>{row.amount}</strong>
            </li>
          ))}
        </ul>
      ) : null}
      {hasParts ? (
        <div className={cn("doc-racing-parts", !hasLabor && "doc-racing-parts--primary")}>
          {hasLabor ? <h4>КУПИЛИ / ПОСТАВИЛИ</h4> : null}
          <ul className="doc-racing-pit-list">
            {partRows.map((row) => (
              <li key={row.id}>
                <span>
                  {row.title}
                  {row.quantity !== "1" ? ` × ${row.quantity}` : ""}
                </span>
                <strong>{row.amount}</strong>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  );
}

function LogbookRail({ points }: { points: RacingViewModel["logbook"] }) {
  if (points.length === 0) return <p className="doc-racing-empty">Бортжурнал пуст</p>;

  return (
    <ol className="doc-racing-logbook">
      {points.map((point) => (
        <li
          key={point.id}
          className={cn(
            "doc-racing-logbook-item",
            point.state === "current" && "doc-racing-logbook-item--current",
            point.state === "future" && "doc-racing-logbook-item--future",
          )}
        >
          <div className="doc-racing-logbook-dot" aria-hidden="true">
            {point.state === "future" ? "◷" : ""}
          </div>
          <div className="doc-racing-logbook-copy">
            <strong>
              {point.state === "future" ? `ждём ${point.date}` : point.date}
            </strong>
            {point.mileage ? <span>{point.mileage}</span> : null}
            <em>{point.title}</em>
          </div>
        </li>
      ))}
    </ol>
  );
}

function MotorDetailGrid({ fields }: { fields: RacingViewModel["motorDetailFields"] }) {
  if (fields.length === 0) {
    return <p className="doc-racing-empty">Данные двигателя не указаны</p>;
  }

  return (
    <dl className="doc-racing-motor-grid">
      {fields.map((field) => (
        <div className="doc-racing-motor-field" key={field.label}>
          <dt>{field.label}</dt>
          <dd>{field.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function DocumentPdfRacingRenderer({ model }: { model: DocumentRenderModel }) {
  const racing = model.racing;
  if (!racing) return null;

  const qrSection = model.sections.find((s) => s.key === "qr");

  return (
    <main
      className={cn(
        "doc-racing-page",
        model.pageClass,
        model.documentWatermark && `doc-racing-page--wm-${model.documentWatermark.type}`,
      )}
      style={{ ...model.brandStyle, ...model.themeStyleVars, ...model.typographyVars, ...model.header.style }}
    >
      {model.documentWatermark ? <DocumentWatermarkLayer watermark={model.documentWatermark} /> : null}

      <div className="doc-racing-page__surface">
        <DocumentPdfHeader header={model.header} />

        <div className="doc-racing-title-row">
        <div className="doc-racing-title-main">
          <h1>{racing.vehicleTitle}</h1>
          <p className="doc-racing-vin">— VIN {racing.vin} —</p>
        </div>
        <div className="doc-racing-plate-box">
          <span>ГОС. НОМЕР</span>
          <strong>{racing.plate}</strong>
        </div>
      </div>

      <CheckeredBar />

      <div className="doc-racing-milestone">
        <span>
          СЛЕДУЮЩИЙ РУБЕЖ <b>{racing.milestoneTarget.toLocaleString("ru-KZ")} км</b>
        </span>
        <span>
          осталось {racing.milestoneRemaining.toLocaleString("ru-KZ")} км — поможем достигнуть
        </span>
      </div>

      <section className="doc-racing-stats">
        <div className="doc-racing-stat">
          <span className="doc-racing-stat-label">ПРОБЕГ</span>
          <strong className="doc-racing-stat-value">{racing.mileage.toLocaleString("ru-KZ")}</strong>
          <em>{racing.mileageLabel}</em>
        </div>
        <div className="doc-racing-stat">
          <span className="doc-racing-stat-label">СУММА</span>
          <strong className="doc-racing-stat-value">{racing.grandTotal}</strong>
          {racing.paidPrefix || racing.warrantyHighlight ? (
            <em className="doc-racing-paid-note">
              {racing.paidPrefix ? <span>{racing.paidPrefix} </span> : null}
              {racing.warrantyHighlight ? (
                <span className="doc-racing-warranty-highlight">{racing.warrantyHighlight}</span>
              ) : null}
            </em>
          ) : null}
        </div>
        <div className="doc-racing-stat doc-racing-stat--accent">
          <span className="doc-racing-stat-label">{racing.nextServiceLabel}</span>
          <strong
            className={cn(
              "doc-racing-stat-value",
              racing.nextServiceKm && "doc-racing-stat-value--red",
            )}
          >
            {racing.nextServiceKm ?? "—"}
          </strong>
          {racing.nextServiceSub ? <em>{racing.nextServiceSub}</em> : null}
        </div>
      </section>

      <div className={cn("doc-racing-main", !racing.showServiceLogbook && "doc-racing-main--single")}>
        <div className="doc-racing-pit">
          <h3>ЧТО СДЕЛАЛИ — ПИТ-СТОП</h3>
          <PitStopList laborRows={racing.laborRows} partRows={racing.partRows} />
          <div className="doc-racing-pit-total">
            <strong>{racing.grandTotal}</strong>
          </div>
        </div>
        {racing.showServiceLogbook ? (
          <div className="doc-racing-log">
            <h3>БОРТЖУРНАЛ</h3>
            {racing.logbookSubtitle ? <p className="doc-racing-log-sub">{racing.logbookSubtitle}</p> : null}
            <LogbookRail points={racing.logbook} />
          </div>
        ) : (
          <div className="doc-racing-motor">
            <h3>ДВИГАТЕЛЬ</h3>
            <MotorDetailGrid fields={racing.motorDetailFields} />
          </div>
        )}
      </div>

      {model.meta.disclaimer ? (
        <p className="doc-racing-legal">{model.meta.disclaimer || racing.disclaimer}</p>
      ) : (
        <p className="doc-racing-legal">{racing.disclaimer}</p>
      )}

      <footer className="doc-racing-signatures">
        <div className="doc-racing-pilot">
          <strong>{racing.clientName}</strong>
          <span>ЗАКАЗЧИК — ПИЛОТ</span>
          {racing.visitNote ? <em>{racing.visitNote}</em> : null}
        </div>
        {qrSection?.key === "qr" ? (
          <div className="doc-racing-qr">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrSection.qr.dataUri} alt="" />
          </div>
        ) : null}
      </footer>

      <CheckeredBar />

        <div className="doc-racing-bottom">
          <span>{racing.edgeLeft}</span>
          <span>ОФОРМИЛ: {racing.executorName.toUpperCase()}</span>
          <span>{racing.edgeRight}</span>
        </div>
      </div>
    </main>
  );
}
