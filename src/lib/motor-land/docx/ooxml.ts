/**
 * Small WordprocessingML helpers.
 *
 * The document is written as raw OOXML rather than through a library: the
 * layout has to match a scanned form one-for-one, and hand-written parts make
 * every border, width and tab stop explicit. Units follow the format — twips
 * (1/1440 in) for layout, half-points for font size, EMU for images.
 */

export const TWIPS_PER_CM = 567;
export const EMU_PER_CM = 360000;

export function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type RunOptions = {
  bold?: boolean;
  italic?: boolean;
  /** Half-points, e.g. `19` renders 9.5pt. */
  size?: number;
  color?: string;
  underline?: boolean;
  spacingTwips?: number;
};

export function runProps({ bold, italic, size, color, underline, spacingTwips }: RunOptions = {}): string {
  const parts = [
    bold ? "<w:b/>" : "",
    italic ? "<w:i/>" : "",
    color ? `<w:color w:val="${color}"/>` : "",
    spacingTwips ? `<w:spacing w:val="${spacingTwips}"/>` : "",
    size ? `<w:sz w:val="${size}"/><w:szCs w:val="${size}"/>` : "",
    underline ? '<w:u w:val="single"/>' : "",
  ].join("");
  return parts ? `<w:rPr>${parts}</w:rPr>` : "";
}

/** A text run; `\n` inside the text becomes a soft line break. */
export function run(text: string, options: RunOptions = {}): string {
  const segments = String(text ?? "").split("\n");
  const body = segments
    .map((segment, index) => `${index > 0 ? "<w:br/>" : ""}<w:t xml:space="preserve">${esc(segment)}</w:t>`)
    .join("");
  return `<w:r>${runProps(options)}${body}</w:r>`;
}

export function tab(): string {
  return "<w:r><w:tab/></w:r>";
}

export type ParagraphOptions = {
  align?: "left" | "center" | "right" | "both";
  /** Space before/after in twips. */
  before?: number;
  after?: number;
  /** Line spacing in twips (240 = single). */
  line?: number;
  indentLeft?: number;
  indentHanging?: number;
  /** Right tab stop position in twips. */
  rightTabAt?: number;
  /** Extra tab stops; an `underscore` leader draws a signature line. */
  tabStops?: Array<{ pos: number; val?: "left" | "right" | "center"; leader?: "underscore" | "dot" | "none" }>;
  bottomBorder?: { size: number; color: string };
  keepNext?: boolean;
  outlineLevel?: number;
};

export function paragraph(content: string, options: ParagraphOptions = {}): string {
  const {
    align,
    before = 0,
    after = 0,
    line,
    indentLeft,
    indentHanging,
    rightTabAt,
    tabStops,
    bottomBorder,
    keepNext,
    outlineLevel,
  } = options;

  const spacing = `<w:spacing w:before="${before}" w:after="${after}"${line ? ` w:line="${line}" w:lineRule="auto"` : ""}/>`;
  const indent =
    indentLeft || indentHanging
      ? `<w:ind${indentLeft ? ` w:left="${indentLeft}"` : ""}${indentHanging ? ` w:hanging="${indentHanging}"` : ""}/>`
      : "";
  const tabDefinitions = [
    ...(rightTabAt ? [`<w:tab w:val="right" w:pos="${rightTabAt}"/>`] : []),
    ...(tabStops ?? []).map(
      (stop) =>
        `<w:tab w:val="${stop.val ?? "left"}" w:pos="${stop.pos}"${stop.leader ? ` w:leader="${stop.leader}"` : ""}/>`,
    ),
  ].join("");
  const tabs = tabDefinitions ? `<w:tabs>${tabDefinitions}</w:tabs>` : "";
  const border = bottomBorder
    ? `<w:pBdr><w:bottom w:val="single" w:sz="${bottomBorder.size}" w:space="1" w:color="${bottomBorder.color}"/></w:pBdr>`
    : "";

  const props = `<w:pPr>${keepNext ? "<w:keepNext/>" : ""}${tabs}${border}${spacing}${indent}${
    align ? `<w:jc w:val="${align}"/>` : ""
  }${outlineLevel !== undefined ? `<w:outlineLvl w:val="${outlineLevel}"/>` : ""}</w:pPr>`;

  return `<w:p>${props}${content}</w:p>`;
}

export type CellBorders = {
  top?: boolean;
  bottom?: boolean;
  left?: boolean;
  right?: boolean;
};

export type CellOptions = {
  width: number;
  borders?: CellBorders;
  borderColor?: string;
  borderSize?: number;
  shade?: string;
  colSpan?: number;
  valign?: "top" | "center" | "bottom";
  marginTwips?: number;
};

export function cell(content: string, options: CellOptions): string {
  const {
    width,
    borders,
    borderColor = "A7B6C6",
    borderSize = 4,
    shade,
    colSpan,
    valign = "center",
    marginTwips = 60,
  } = options;

  const edge = (side: keyof CellBorders) =>
    borders?.[side]
      ? `<w:${side} w:val="single" w:sz="${borderSize}" w:space="0" w:color="${borderColor}"/>`
      : `<w:${side} w:val="nil"/>`;

  const borderXml = borders
    ? `<w:tcBorders>${edge("top")}${edge("left")}${edge("bottom")}${edge("right")}</w:tcBorders>`
    : "";

  return [
    "<w:tc><w:tcPr>",
    `<w:tcW w:w="${width}" w:type="dxa"/>`,
    colSpan && colSpan > 1 ? `<w:gridSpan w:val="${colSpan}"/>` : "",
    borderXml,
    shade ? `<w:shd w:val="clear" w:color="auto" w:fill="${shade}"/>` : "",
    `<w:tcMar><w:top w:w="${marginTwips}" w:type="dxa"/><w:left w:w="80" w:type="dxa"/><w:bottom w:w="${marginTwips}" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tcMar>`,
    `<w:vAlign w:val="${valign}"/>`,
    "</w:tcPr>",
    content,
    "</w:tc>",
  ].join("");
}

export function row(cells: string, options: { height?: number; header?: boolean } = {}): string {
  const props =
    options.height || options.header
      ? `<w:trPr>${options.header ? "<w:tblHeader/>" : ""}${
          options.height ? `<w:trHeight w:val="${options.height}" w:hRule="atLeast"/>` : ""
        }</w:trPr>`
      : "";
  return `<w:tr>${props}${cells}</w:tr>`;
}

export function table(rows: string, columnWidths: number[], options: { indent?: number } = {}): string {
  const grid = columnWidths.map((width) => `<w:gridCol w:w="${width}"/>`).join("");
  const total = columnWidths.reduce((sum, width) => sum + width, 0);
  return [
    "<w:tbl><w:tblPr>",
    `<w:tblW w:w="${total}" w:type="dxa"/>`,
    options.indent ? `<w:tblInd w:w="${options.indent}" w:type="dxa"/>` : "",
    '<w:tblLayout w:type="fixed"/>',
    '<w:tblCellMar><w:left w:w="80" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar>',
    "</w:tblPr>",
    `<w:tblGrid>${grid}</w:tblGrid>`,
    rows,
    "</w:tbl>",
  ].join("");
}

export function pageBreak(): string {
  return '<w:p><w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr><w:r><w:br w:type="page"/></w:r></w:p>';
}

/** `Страница 1 / 2` built from live PAGE/NUMPAGES fields. */
export function pageNumberField(options: RunOptions = {}): string {
  const props = runProps(options);
  return [
    `<w:r>${props}<w:fldChar w:fldCharType="begin"/></w:r>`,
    `<w:r>${props}<w:instrText xml:space="preserve"> PAGE </w:instrText></w:r>`,
    `<w:r>${props}<w:fldChar w:fldCharType="separate"/></w:r>`,
    `<w:r>${props}<w:t>1</w:t></w:r>`,
    `<w:r>${props}<w:fldChar w:fldCharType="end"/></w:r>`,
    run(" / ", options),
    `<w:r>${props}<w:fldChar w:fldCharType="begin"/></w:r>`,
    `<w:r>${props}<w:instrText xml:space="preserve"> NUMPAGES </w:instrText></w:r>`,
    `<w:r>${props}<w:fldChar w:fldCharType="separate"/></w:r>`,
    `<w:r>${props}<w:t>2</w:t></w:r>`,
    `<w:r>${props}<w:fldChar w:fldCharType="end"/></w:r>`,
  ].join("");
}

/** Inline image run. Sizes are centimetres; `relationshipId` must exist in document.xml.rels. */
export function inlineImage(options: {
  relationshipId: string;
  name: string;
  widthCm: number;
  heightCm: number;
  docPrId: number;
}): string {
  const cx = Math.round(options.widthCm * EMU_PER_CM);
  const cy = Math.round(options.heightCm * EMU_PER_CM);
  return [
    "<w:r><w:drawing>",
    '<wp:inline distT="0" distB="0" distL="0" distR="0">',
    `<wp:extent cx="${cx}" cy="${cy}"/>`,
    '<wp:effectExtent l="0" t="0" r="0" b="0"/>',
    `<wp:docPr id="${options.docPrId}" name="${esc(options.name)}"/>`,
    '<wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr>',
    '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">',
    '<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">',
    '<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">',
    `<pic:nvPicPr><pic:cNvPr id="${options.docPrId}" name="${esc(options.name)}"/><pic:cNvPicPr/></pic:nvPicPr>`,
    `<pic:blipFill><a:blip r:embed="${options.relationshipId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>`,
    `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>`,
    "</pic:pic></a:graphicData></a:graphic></wp:inline>",
    "</w:drawing></w:r>",
  ].join("");
}

export const DOCUMENT_NAMESPACES = [
  'xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"',
  'xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"',
  'xmlns:o="urn:schemas-microsoft-com:office:office"',
  'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"',
  'xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"',
  'xmlns:v="urn:schemas-microsoft-com:vml"',
  'xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing"',
  'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"',
  'xmlns:w10="urn:schemas-microsoft-com:office:word"',
  'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"',
  'xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"',
  'xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup"',
  'xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk"',
  'xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml"',
  'xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"',
  'mc:Ignorable="w14 wp14"',
].join(" ");

export const XML_DECLARATION = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n';
