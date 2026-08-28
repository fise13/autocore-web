import {
  DEFAULT_DOCUMENT_UI_LABELS,
  type DocumentUiLabels,
} from "@/lib/documents/document-context";
import { DocumentHeaderModel } from "@/lib/documents/header/build-document-header-model";
import { cn } from "@/lib/utils";

type DocumentPdfHeaderProps = {
  header: DocumentHeaderModel;
  preview?: boolean;
  ui?: Partial<DocumentUiLabels>;
};

function HeaderContactLines({ header }: { header: DocumentHeaderModel }) {
  const items: string[] = [];

  if (header.visibility.showPhone && header.phone?.trim()) {
    items.push(header.phone.trim());
  }
  if (header.visibility.showEmail && header.email?.trim()) {
    items.push(header.email.trim());
  }
  if (header.visibility.showWebsite && header.website?.trim()) {
    items.push(header.website.trim());
  }

  if (items.length === 0) return null;

  return (
    <div className="doc-pdf-header__contact">
      {items.map((item, index) => (
        <span key={`${index}-${item}`} className="doc-pdf-header__contact-item">
          {item}
        </span>
      ))}
    </div>
  );
}

export function DocumentPdfHeader({
  header,
  preview = false,
  ui,
}: DocumentPdfHeaderProps) {
  if (!header.visibility.showHeader) {
    return null;
  }

  const labels = { ...DEFAULT_DOCUMENT_UI_LABELS, ...ui };
  const showMeta =
    header.visibility.showDocumentNumber ||
    header.visibility.showDate ||
    (header.visibility.showQr && header.qrDataUri);
  const showTag = Boolean(header.documentTag?.trim());
  const showTitle = Boolean(header.documentTitle?.trim());

  return (
    <header
      className={cn(
        "doc-pdf-header",
        `doc-pdf-header--${header.theme}`,
        header.themeClass,
        preview && "doc-pdf-header--preview",
      )}
      style={header.style}
    >
      <div className="doc-pdf-header__brand">
        {header.renderLogo && header.logoDataUri ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={header.logoDataUri}
            alt={header.displayName}
            className="doc-pdf-header__logo"
          />
        ) : null}

        {header.renderCompanyName ? (
          <div className="doc-pdf-header__identity">
            {/*
              A rendered document is embedded inside other pages — the marketing
              product walkthrough and the in-app document previews — so its
              company name must not announce itself as those pages' top-level
              heading. `/product` was shipping three `<h1>`s for exactly this
              reason. Styling is class-driven, so the document itself is
              pixel-identical.
            */}
            <p className="doc-pdf-header__name">{header.displayName}</p>
            {header.slogan ? <p className="doc-pdf-header__slogan">{header.slogan}</p> : null}
            {header.address ? <p className="doc-pdf-header__address">{header.address}</p> : null}
            <HeaderContactLines header={header} />
          </div>
        ) : null}
      </div>

      {showMeta || showTag || showTitle ? (
        <div className="doc-pdf-header__meta">
          {showTag ? <span className="doc-pdf-header__tag">{header.documentTag}</span> : null}
          {showTitle ? <h2 className="doc-pdf-header__title">{header.documentTitle}</h2> : null}
          <dl className="doc-pdf-header__meta-list">
            {header.visibility.showDocumentNumber ? (
              <div>
                <dt>{labels.number}</dt>
                <dd>{header.orderLabel}</dd>
              </div>
            ) : null}
            {header.visibility.showDate ? (
              <div>
                <dt>{labels.date}</dt>
                <dd>{header.documentDate}</dd>
              </div>
            ) : null}
          </dl>
          {header.visibility.showQr && header.qrDataUri ? (
            <div className="doc-pdf-header__qr">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={header.qrDataUri} alt="" />
            </div>
          ) : null}
        </div>
      ) : null}
    </header>
  );
}
