import { printInk } from "@/lib/motor-land/print-palette";
import {
  COMPANY,
  computeTotals,
  formatDateTime,
  formatMoney,
  formatQuantity,
  itemAmount,
  type SaleDocumentData,
} from "@/lib/motor-land/sale-document";
import {
  WARRANTY_ACKNOWLEDGEMENT,
  WARRANTY_EXCLUSIONS,
  WARRANTY_EXCLUSIONS_TITLE,
  WARRANTY_TERMS,
  WARRANTY_TITLE,
} from "@/lib/motor-land/warranty-terms";

/**
 * On-screen twin of the generated Word file.
 *
 * Every length is expressed in `cqw` against an A4-wide container, so the sheet
 * keeps the printed proportions at any preview size and the operator sees the
 * page they will hand to the customer. The colours come from the shared print
 * palette rather than the UI tokens: this is paper, and it stays white in dark
 * mode.
 */

const A4_WIDTH_MM = 210;

/** Millimetres → container-relative width, so the whole sheet scales as one. */
function mm(value: number): string {
  return `${((value / A4_WIDTH_MM) * 100).toFixed(4)}cqw`;
}

/** Points → millimetres → `cqw`, for type sized the same way Word sizes it. */
function pt(value: number): string {
  return mm(value * 0.352778);
}

const ink = printInk("ink");
const label = printInk("label");
const muted = printInk("muted");
const line = printInk("line");

const cellBorder = `${mm(0.18)} solid ${line}`;

function Field({ caption, value }: { caption: string; value: string }) {
  return (
    <div style={{ display: "flex", gap: mm(1.5) }}>
      <span style={{ color: label, flex: `0 0 ${mm(35)}` }}>{caption}</span>
      <span style={{ color: ink, minWidth: 0, overflowWrap: "anywhere" }}>{value}</span>
    </div>
  );
}

function HeadCell({
  children,
  width,
  align = "center",
}: {
  children?: React.ReactNode;
  /** Omitted for the one column that absorbs the remaining width. */
  width?: string;
  align?: "left" | "center" | "right";
}) {
  return (
    <th
      style={{
        width,
        border: cellBorder,
        padding: `${mm(0.9)} ${mm(1)}`,
        fontWeight: 400,
        textAlign: align,
        color: ink,
      }}
    >
      {children}
    </th>
  );
}

function BodyCell({
  children,
  align = "left",
  bold,
  span,
  plain,
}: {
  children?: React.ReactNode;
  align?: "left" | "center" | "right";
  bold?: boolean;
  span?: number;
  plain?: boolean;
}) {
  return (
    <td
      colSpan={span}
      style={{
        border: plain ? "none" : cellBorder,
        padding: `${mm(0.9)} ${mm(1)}`,
        textAlign: align,
        fontWeight: bold ? 600 : 400,
        color: ink,
      }}
    >
      {children}
    </td>
  );
}

function SectionCaption({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ textAlign: "center", color: ink, margin: `${mm(2.5)} 0 ${mm(1)}` }}>{children}</p>
  );
}

/** The only signature the form asks for: the buyer confirming receipt. */
function BuyerSignature() {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: mm(2), width: "50%" }}>
      <span style={{ color: label, whiteSpace: "nowrap" }}>Покупатель:</span>
      <span style={{ flex: 1, borderBottom: `${mm(0.18)} solid ${label}`, paddingBottom: mm(0.6) }}>
        {"\u00a0"}
      </span>
    </div>
  );
}

function Sheet({ children }: { children: React.ReactNode }) {
  return (
    <section
      className="motor-land-sheet"
      style={{
        containerType: "inline-size",
        width: "100%",
        aspectRatio: "210 / 297",
        background: "#FFFFFF",
        color: ink,
        boxShadow: "0 1px 3px rgba(15, 23, 42, 0.18), 0 12px 32px rgba(15, 23, 42, 0.12)",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          padding: mm(10),
          fontFamily: "Arial, Helvetica, sans-serif",
          fontSize: pt(9),
          lineHeight: 1.25,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {children}
      </div>
    </section>
  );
}

export function SaleDocumentSheet({ data }: { data: SaleDocumentData }) {
  const totals = computeTotals(data);
  const vatNote =
    data.vatRate > 0
      ? ` (в т.ч. НДС ${formatQuantity(data.vatRate)}%: ${formatMoney(totals.vatIncluded)})`
      : "";

  return (
    <Sheet>
      <header style={{ display: "flex", alignItems: "flex-start", gap: mm(4) }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- fixed-size print mark, no layout shift to optimise */}
        <img src="/motor-land/logo.png" alt="Motor Land" style={{ width: mm(29), height: mm(29) }} />
        <div style={{ flex: 1, textAlign: "center", paddingTop: mm(3) }}>
          <p style={{ color: ink }}>{COMPANY.legalName}</p>
          <p style={{ color: ink, marginTop: mm(1) }}>{COMPANY.address}</p>
          <p style={{ color: muted, marginTop: mm(1), fontSize: pt(8) }}>{COMPANY.site.toUpperCase()}</p>
        </div>
        <div style={{ width: mm(34), paddingTop: mm(3), textAlign: "right" }}>
          {COMPANY.phones.map((phone) => (
            <p key={phone} style={{ color: ink, fontWeight: 600, letterSpacing: pt(0.2) }}>
              {phone}
            </p>
          ))}
        </div>
      </header>

      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: mm(4),
          borderBottom: `${mm(0.3)} solid ${label}`,
          paddingBottom: mm(1.4),
          marginTop: mm(4.5),
        }}
      >
        <h1 style={{ fontSize: pt(15), fontWeight: 600, color: ink }}>
          Товарная накладная № {data.documentNumber}
        </h1>
        <span style={{ fontSize: pt(9.5), color: label, whiteSpace: "nowrap" }}>
          {formatDateTime(data.issuedAt)}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: mm(2), marginTop: mm(3.5) }}>
        <Field caption="Менеджер:" value={data.customer.manager} />
        <Field caption="Клиент:" value={data.customer.client} />
      </div>

      <SectionCaption>Запасные части и материалы</SectionCaption>
      <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
        <thead>
          <tr>
            <HeadCell width={mm(10)}>№</HeadCell>
            <HeadCell width={mm(25)}>Номер</HeadCell>
            <HeadCell>Наименование</HeadCell>
            <HeadCell width={mm(21)}>Количество</HeadCell>
            <HeadCell width={mm(9)} />
            <HeadCell width={mm(21)}>Цена</HeadCell>
            <HeadCell width={mm(23)}>Сумма</HeadCell>
          </tr>
        </thead>
        <tbody>
          {data.items.map((item, index) => (
            <tr key={item.id}>
              <BodyCell align="center">{index + 1}</BodyCell>
              <BodyCell align="center">{item.serial}</BodyCell>
              <BodyCell>{item.title}</BodyCell>
              <BodyCell align="right">{formatQuantity(item.quantity)}</BodyCell>
              <BodyCell align="center">{item.unit}</BodyCell>
              <BodyCell align="right">{formatMoney(item.price)}</BodyCell>
              <BodyCell align="right">{formatMoney(itemAmount(item))}</BodyCell>
            </tr>
          ))}
          <tr>
            <BodyCell span={3} align="right" plain>
              Итого:
            </BodyCell>
            <BodyCell align="right">{formatQuantity(totals.itemsQuantity)}</BodyCell>
            <BodyCell />
            <BodyCell />
            <BodyCell align="right" bold>
              {formatMoney(totals.total)}
            </BodyCell>
          </tr>
        </tbody>
      </table>

      <div style={{ display: "flex", gap: mm(4), alignItems: "baseline", marginTop: mm(4) }}>
        <span style={{ flex: `0 0 ${mm(56)}`, fontSize: pt(12), color: ink }}>Сумма документа:</span>
        <span style={{ fontSize: pt(12), fontWeight: 600, color: ink }}>
          {formatMoney(totals.total)}
          <span style={{ fontWeight: 400 }}>{vatNote}</span>
        </span>
      </div>

      <div style={{ marginTop: mm(3), fontSize: pt(8.5), color: ink, textAlign: "justify" }}>
        <p>
          Продавец несет гарантийные обязательства при условии соблюдения покупателем правил эксплуатации
          агрегата и рекомендаций продавца по его установке и обслуживанию.
        </p>
        <p style={{ marginTop: mm(1.5) }}>{WARRANTY_ACKNOWLEDGEMENT}</p>
      </div>

      <h2
        style={{
          textAlign: "center",
          fontSize: pt(11),
          fontWeight: 700,
          marginTop: mm(3.5),
          paddingBottom: mm(1),
          borderBottom: `${mm(0.2)} solid ${label}`,
        }}
      >
        {WARRANTY_TITLE}
      </h2>

      <ol
        style={{
          fontSize: pt(8),
          lineHeight: 1.16,
          marginTop: mm(1.5),
          paddingLeft: mm(6),
          listStyle: "decimal",
          columnCount: 2,
          columnGap: mm(6),
        }}
      >
        {WARRANTY_TERMS.map((text, index) => (
          <li key={index} style={{ marginTop: mm(0.5), textAlign: "justify" }}>
            {text}
          </li>
        ))}
      </ol>

      <h3 style={{ textAlign: "center", fontSize: pt(9.5), fontWeight: 700, marginTop: mm(1.5) }}>
        {WARRANTY_EXCLUSIONS_TITLE}
      </h3>
      <ol
        style={{
          fontSize: pt(8),
          lineHeight: 1.16,
          marginTop: mm(1.2),
          paddingLeft: mm(6),
          listStyle: "decimal",
          columnCount: 2,
          columnGap: mm(6),
        }}
      >
        {WARRANTY_EXCLUSIONS.map((text, index) => (
          <li key={index} style={{ marginTop: mm(0.5), textAlign: "justify" }}>
            {text}
          </li>
        ))}
      </ol>

      <div style={{ marginTop: "auto", paddingTop: mm(4) }}>
        <BuyerSignature />
        <p style={{ marginTop: mm(2), textAlign: "center", fontSize: pt(6.5), color: muted }}>
          {COMPANY.brand} · {COMPANY.phones.join(" · ")}
        </p>
      </div>
    </Sheet>
  );
}
