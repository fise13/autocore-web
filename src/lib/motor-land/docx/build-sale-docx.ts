/**
 * Builds the Motor Land goods waybill («товарная накладная») as WordprocessingML.
 *
 * Page 1 reproduces the company's printed form (logo, requisites, the two
 * identity lines, the goods table, total, signatures); page 2 is the warranty the
 * form is always printed back-to-back with — hence the hard page break rather
 * than a separate file.
 */

import { PRINT_INK } from "../print-palette";
import {
  COMPANY,
  computeTotals,
  formatDateTime,
  formatMoney,
  formatQuantity,
  itemAmount,
  type SaleDocumentData,
} from "../sale-document";
import {
  WARRANTY_ACKNOWLEDGEMENT,
  WARRANTY_EXCLUSIONS,
  WARRANTY_EXCLUSIONS_TITLE,
  WARRANTY_TERMS,
  WARRANTY_TITLE,
} from "../warranty-terms";
import {
  DOCUMENT_NAMESPACES,
  XML_DECLARATION,
  cell,
  esc,
  inlineImage,
  pageBreak,
  pageNumberField,
  paragraph,
  row,
  run,
  table,
  tab,
} from "./ooxml";

/** A4 minus 1 cm margins. Every table width below is a slice of this. */
const CONTENT_WIDTH = 10772;
const MARGIN = 567;

const INK = PRINT_INK.ink;
const LABEL = PRINT_INK.label;
const MUTED = PRINT_INK.muted;
const LINE = PRINT_INK.line;

const FIELD_GRID = [2000, CONTENT_WIDTH - 2000];
const ITEM_GRID = [520, 1400, 4952, 1100, 500, 1100, 1200];
const SIGNATURE_GRID = [1600, 3786, CONTENT_WIDTH - 5386];

const RELS = {
  styles: "rId1",
  settings: "rId2",
  footer: "rId3",
  logo: "rId4",
} as const;

function labelRun(text: string): string {
  return run(text, { size: 18, color: LABEL });
}

function valueRun(text: string): string {
  return run(text, { size: 18, color: INK });
}

function headerCell(text: string, width: number, align: "left" | "center" | "right" = "center"): string {
  return cell(paragraph(run(text, { size: 17, color: INK }), { align, before: 20, after: 20 }), {
    width,
    borders: { top: true, bottom: true, left: true, right: true },
    borderColor: LINE,
  });
}

function bodyCell(
  text: string,
  width: number,
  align: "left" | "center" | "right" = "left",
  options: { bold?: boolean } = {},
): string {
  return cell(
    paragraph(run(text, { size: 17, color: INK, bold: options.bold }), { align, before: 20, after: 20 }),
    { width, borders: { top: true, bottom: true, left: true, right: true }, borderColor: LINE },
  );
}

function sectionCaption(text: string): string {
  return paragraph(run(text, { size: 17, color: INK }), { align: "center", before: 200, after: 60, keepNext: true });
}

function buildHeader(data: SaleDocumentData): string {
  const logoCell = cell(
    paragraph(
      inlineImage({ relationshipId: RELS.logo, name: "Motor Land", widthCm: 2.9, heightCm: 2.9, docPrId: 1 }),
      { align: "left" },
    ),
    { width: 2300, valign: "top" },
  );

  const requisitesCell = cell(
    [
      paragraph(run(COMPANY.legalName, { size: 19, color: INK }), { align: "center", before: 200 }),
      paragraph(run(COMPANY.address, { size: 19, color: INK }), { align: "center", before: 50 }),
      paragraph(run(COMPANY.site.toUpperCase(), { size: 17, color: MUTED }), { align: "center", before: 50 }),
    ].join(""),
    { width: 6172, valign: "top" },
  );

  // Mirror of the logo column, so the requisites stay optically centred.
  const spacerCell = cell("<w:p/>", { width: 2300, valign: "top" });

  const title = paragraph(
    [
      run(`Товарная накладная № ${data.documentNumber}`, { size: 30, bold: true, color: INK }),
      tab(),
      run(formatDateTime(data.issuedAt), { size: 19, color: LABEL }),
    ].join(""),
    { before: 240, after: 80, rightTabAt: CONTENT_WIDTH, bottomBorder: { size: 8, color: LABEL }, outlineLevel: 0 },
  );

  return table(row(logoCell + requisitesCell + spacerCell), [2300, 6172, 2300]) + title;
}

function buildFields(data: SaleDocumentData): string {
  const fieldRow = (caption: string, value: string) =>
    row(
      cell(paragraph(labelRun(caption), { before: 60, after: 60 }), { width: FIELD_GRID[0]!, valign: "top" }) +
        cell(paragraph(valueRun(value), { before: 60, after: 60 }), { width: FIELD_GRID[1]!, valign: "top" }),
    );

  return table(fieldRow("Заказчик:", data.customer.orderer) + fieldRow("Клиент:", data.customer.client), FIELD_GRID);
}

function buildItems(data: SaleDocumentData): string {
  const totals = computeTotals(data);

  const header = row(
    headerCell("№", ITEM_GRID[0]!) +
      headerCell("Номер", ITEM_GRID[1]!) +
      headerCell("Наименование", ITEM_GRID[2]!) +
      headerCell("Количество", ITEM_GRID[3]!) +
      headerCell("", ITEM_GRID[4]!) +
      headerCell("Цена", ITEM_GRID[5]!) +
      headerCell("Сумма", ITEM_GRID[6]!),
    { header: true },
  );

  const rows = data.items
    .map((item, index) =>
      row(
        bodyCell(String(index + 1), ITEM_GRID[0]!, "center") +
          bodyCell(item.serial, ITEM_GRID[1]!, "center") +
          bodyCell(item.title, ITEM_GRID[2]!) +
          bodyCell(formatQuantity(item.quantity), ITEM_GRID[3]!, "right") +
          bodyCell(item.unit, ITEM_GRID[4]!, "center") +
          bodyCell(formatMoney(item.price), ITEM_GRID[5]!, "right") +
          bodyCell(formatMoney(itemAmount(item)), ITEM_GRID[6]!, "right"),
      ),
    )
    .join("");

  const totalRow = row(
    cell(paragraph(run("Итого:", { size: 17, color: INK }), { align: "right", before: 20, after: 20 }), {
      width: ITEM_GRID.slice(0, 3).reduce((sum, width) => sum + width, 0),
      colSpan: 3,
    }) +
      bodyCell(formatQuantity(totals.itemsQuantity), ITEM_GRID[3]!, "right") +
      bodyCell("", ITEM_GRID[4]!) +
      bodyCell("", ITEM_GRID[5]!) +
      bodyCell(formatMoney(totals.total), ITEM_GRID[6]!, "right", { bold: true }),
  );

  return sectionCaption("Запасные части и материалы") + table(header + rows + totalRow, ITEM_GRID);
}

function buildTotals(data: SaleDocumentData): string {
  const totals = computeTotals(data);
  const vatNote =
    data.vatRate > 0 ? ` (в т.ч. НДС ${formatQuantity(data.vatRate)}%: ${formatMoney(totals.vatIncluded)})` : "";

  return table(
    row(
      cell(paragraph(run("Сумма документа:", { size: 24, color: INK }), { before: 60, after: 60 }), {
        width: 3200,
      }) +
        cell(
          paragraph(
            run(formatMoney(totals.total), { size: 24, bold: true, color: INK }) +
              (vatNote ? run(vatNote, { size: 24, color: INK }) : ""),
            { before: 60, after: 60 },
          ),
          { width: CONTENT_WIDTH - 3200 },
        ),
    ),
    [3200, CONTENT_WIDTH - 3200],
  );
}

/** The only signature the form asks for: the buyer confirming receipt. */
function buyerSignature(): string {
  return (
    cell(paragraph(labelRun("Покупатель:"), { before: 120, after: 40 }), {
      width: SIGNATURE_GRID[0]!,
      valign: "bottom",
    }) +
    cell("<w:p/>", {
      width: SIGNATURE_GRID[1]!,
      borders: { bottom: true },
      borderColor: LABEL,
      valign: "bottom",
    }) +
    cell("<w:p/>", { width: SIGNATURE_GRID[2]!, valign: "bottom" })
  );
}

function buildFooterBlock(): string {
  const legal = [
    paragraph(
      run(
        "Продавец несет гарантийные обязательства при условии соблюдения покупателем правил эксплуатации агрегата и рекомендаций продавца по его установке и обслуживанию.",
        { size: 17, color: INK },
      ),
      { before: 260, after: 80, align: "both" },
    ),
    paragraph(
      run(`${WARRANTY_ACKNOWLEDGEMENT} Условия гарантии приведены на обороте документа.`, { size: 17, color: INK }),
      { before: 0, after: 200, align: "both" },
    ),
  ].join("");

  return legal + table(row(buyerSignature()), SIGNATURE_GRID);
}

function buildWarrantyPage(data: SaleDocumentData): string {
  const numbered = (text: string, index: number) =>
    paragraph(
      run(`${index + 1}. `, { size: 19, color: INK, bold: true }) + run(text, { size: 19, color: INK }),
      { before: 50, after: 50, align: "both", indentLeft: 320, indentHanging: 320, line: 240 },
    );

  return [
    pageBreak(),
    paragraph(
      run(`Приложение к товарной накладной № ${data.documentNumber} от ${formatDateTime(data.issuedAt)}`, {
        size: 15,
        color: MUTED,
      }),
      { align: "right", after: 40 },
    ),
    paragraph(run(WARRANTY_TITLE, { size: 26, bold: true, color: INK }), { align: "center", after: 160 }),
    ...WARRANTY_TERMS.map(numbered),
    paragraph(run(WARRANTY_EXCLUSIONS_TITLE, { size: 21, bold: true, color: INK }), {
      align: "center",
      before: 220,
      after: 100,
    }),
    ...WARRANTY_EXCLUSIONS.map(numbered),
    paragraph(run(WARRANTY_ACKNOWLEDGEMENT, { size: 18, color: INK }), { before: 240, after: 120, align: "both" }),
    table(row(buyerSignature()), SIGNATURE_GRID),
  ].join("");
}

function buildDocumentXml(data: SaleDocumentData): string {
  const sectPr = [
    "<w:sectPr>",
    `<w:footerReference w:type="default" r:id="${RELS.footer}"/>`,
    '<w:pgSz w:w="11906" w:h="16838"/>',
    `<w:pgMar w:top="${MARGIN}" w:right="${MARGIN}" w:bottom="${MARGIN}" w:left="${MARGIN}" w:header="340" w:footer="280" w:gutter="0"/>`,
    '<w:cols w:space="708"/><w:docGrid w:linePitch="360"/>',
    "</w:sectPr>",
  ].join("");

  const body = [
    buildHeader(data),
    buildFields(data),
    buildItems(data),
    buildTotals(data),
    buildFooterBlock(),
    buildWarrantyPage(data),
    sectPr,
  ].join("");

  return `${XML_DECLARATION}<w:document ${DOCUMENT_NAMESPACES}><w:body>${body}</w:body></w:document>`;
}

function stylesXml(): string {
  return `${XML_DECLARATION}<w:styles ${DOCUMENT_NAMESPACES}>
<w:docDefaults><w:rPrDefault><w:rPr>
<w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial" w:eastAsia="Arial"/>
<w:color w:val="${INK}"/><w:sz w:val="18"/><w:szCs w:val="18"/>
<w:lang w:val="ru-RU" w:eastAsia="ru-RU" w:bidi="ar-SA"/>
</w:rPr></w:rPrDefault>
<w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:pPrDefault>
</w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>
<w:style w:type="table" w:default="1" w:styleId="TableNormal"><w:name w:val="Normal Table"/><w:semiHidden/><w:unhideWhenUsed/>
<w:tblPr><w:tblInd w:w="0" w:type="dxa"/><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="80" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style>
</w:styles>`;
}

function settingsXml(): string {
  return `${XML_DECLARATION}<w:settings ${DOCUMENT_NAMESPACES}>
<w:zoom w:percent="100"/><w:defaultTabStop w:val="708"/><w:updateFields w:val="true"/>
<w:compat><w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/></w:compat>
</w:settings>`;
}

function footerXml(): string {
  return `${XML_DECLARATION}<w:ftr ${DOCUMENT_NAMESPACES}>${paragraph(
    run("Страница ", { size: 15, color: MUTED }) + pageNumberField({ size: 15, color: MUTED }),
    { align: "right" },
  )}</w:ftr>`;
}

function contentTypesXml(): string {
  return `${XML_DECLARATION}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Default Extension="png" ContentType="image/png"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
<Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>
<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`;
}

function rootRelsXml(): string {
  return `${XML_DECLARATION}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;
}

function documentRelsXml(): string {
  return `${XML_DECLARATION}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="${RELS.styles}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
<Relationship Id="${RELS.settings}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>
<Relationship Id="${RELS.footer}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>
<Relationship Id="${RELS.logo}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/logo.png"/>
</Relationships>`;
}

function corePropsXml(data: SaleDocumentData): string {
  const created = new Date(data.issuedAt);
  const stamp = (Number.isNaN(created.getTime()) ? new Date() : created).toISOString().replace(/\.\d{3}Z$/, "Z");
  return `${XML_DECLARATION}<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
<dc:title>Товарная накладная № ${esc(data.documentNumber)}</dc:title>
<dc:creator>${esc(COMPANY.brand)}</dc:creator>
<cp:lastModifiedBy>${esc(COMPANY.brand)}</cp:lastModifiedBy>
<dcterms:created xsi:type="dcterms:W3CDTF">${stamp}</dcterms:created>
<dcterms:modified xsi:type="dcterms:W3CDTF">${stamp}</dcterms:modified>
</cp:coreProperties>`;
}

function appPropsXml(): string {
  return `${XML_DECLARATION}<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
<Application>AutoCore</Application><Company>${esc(COMPANY.brand)}</Company><Pages>2</Pages>
</Properties>`;
}

export type SaleDocxAssets = {
  /** PNG bytes for the round Motor Land logo printed top-left. */
  logoPng: Uint8Array;
};

export type DocxParts = Record<string, string | Uint8Array>;

/** Every part of the .docx package, keyed by its path inside the zip. */
export function buildSaleDocxParts(data: SaleDocumentData, assets: SaleDocxAssets): DocxParts {
  return {
    "[Content_Types].xml": contentTypesXml(),
    "_rels/.rels": rootRelsXml(),
    "word/document.xml": buildDocumentXml(data),
    "word/_rels/document.xml.rels": documentRelsXml(),
    "word/styles.xml": stylesXml(),
    "word/settings.xml": settingsXml(),
    "word/footer1.xml": footerXml(),
    "word/media/logo.png": assets.logoPng,
    "docProps/core.xml": corePropsXml(data),
    "docProps/app.xml": appPropsXml(),
  };
}
