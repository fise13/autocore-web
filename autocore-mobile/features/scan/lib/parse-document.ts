/**
 * Deterministic field extraction from OCR text (regex + light heuristics).
 * No AI. See docs/MOBILE-SCANNER-DESIGN.md §4.4.
 */

import { classifyDocument, type DocumentClass } from './classify-document';
import { findVinInText } from './vin';

export type DocumentLineItem = {
  name: string;
  qty?: number;
  unitPrice?: number;
  sum?: number;
};

export type ParsedDocument = {
  kind: DocumentClass;
  number?: string;
  date?: string;
  merchant?: string;
  inn?: string;
  phone?: string;
  clientName?: string;
  plate?: string;
  vin?: string;
  total?: number;
  lines: DocumentLineItem[];
  totalsMatch: boolean | null;
  confidence: 'high' | 'medium' | 'low';
};

function firstMatch(text: string, patterns: RegExp[]): string | undefined {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return undefined;
}

function parseMoney(raw: string): number | undefined {
  const normalized = raw.replace(/\s/g, '').replace(',', '.');
  const value = Number(normalized);
  return Number.isFinite(value) ? value : undefined;
}

function extractTotal(text: string): number | undefined {
  const match = text.match(/(?:итого|к\s+оплате|всего)[^\d]{0,12}(\d[\d\s]*[.,]\d{2}|\d[\d\s]{2,})/i);
  return match?.[1] ? parseMoney(match[1]) : undefined;
}

function extractLines(text: string): DocumentLineItem[] {
  const lines: DocumentLineItem[] = [];
  const rowPattern =
    /^(.{3,48}?)\s+(\d+(?:[.,]\d+)?)\s+(?:x|×|\*)?\s*(\d[\d\s]*[.,]\d{2})\s+(\d[\d\s]*[.,]\d{2})\s*$/gim;

  let match: RegExpExecArray | null;
  while ((match = rowPattern.exec(text)) !== null) {
    const name = match[1].trim();
    if (/итого|всего|сумма/i.test(name)) continue;
    lines.push({
      name,
      qty: Number(match[2].replace(',', '.')),
      unitPrice: parseMoney(match[3]),
      sum: parseMoney(match[4]),
    });
  }

  return lines.slice(0, 40);
}

function totalsMatch(lines: DocumentLineItem[], total?: number): boolean | null {
  if (total == null || lines.length === 0) return null;
  const sum = lines.reduce((acc, line) => acc + (line.sum ?? (line.qty ?? 0) * (line.unitPrice ?? 0)), 0);
  return Math.abs(sum - total) <= 1;
}

export function parseDocumentText(text: string, codes: string[] = []): ParsedDocument {
  const kind = classifyDocument(text);
  const lines = extractLines(text);
  const total = extractTotal(text);
  const vin = findVinInText(text) ?? findVinInText(codes.join(' '));

  const number = firstMatch(text, [
    /(?:сч[её]т|накладн(?:ая)?|чек|заказ-?наряд)\s*(?:№|N|No\.?)?\s*([A-ZА-Я0-9\-\/]+)/i,
    /№\s*([A-ZА-Я0-9\-\/]{2,})/i,
  ]);

  const date = firstMatch(text, [
    /(\d{2}[./]\d{2}[./]\d{2,4})/,
    /(\d{4}-\d{2}-\d{2})/,
  ]);

  const inn = firstMatch(text, [/(?:инн|бин)[:\s]*(\d{9,12})/i]);
  const phone = firstMatch(text, [/(?:\+7|8)[\s-]?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}/]);
  const plate = firstMatch(text, [/([АВЕКМНОРСТУХABEKMHOPCTYX]\d{3}[АВЕКМНОРСТУХABEKMHOPCTYX]{2}\d{2,3})/i]);

  const merchant = firstMatch(text, [
    /(?:поставщик|продавец|организация)[:\s]+([^\n]{3,60})/i,
    /(?:ооо|ип|тоо)\s+[«"]?([^\n«»"]{2,40})/i,
  ]);

  const clientName = firstMatch(text, [
    /(?:покупатель|заказчик|клиент)[:\s]+([^\n]{3,60})/i,
  ]);

  const match = totalsMatch(lines, total);
  let confidence: ParsedDocument['confidence'] = 'low';
  if (kind !== 'unknown' && (total != null || lines.length > 0 || vin)) {
    confidence = match === true ? 'high' : 'medium';
  }

  return {
    kind,
    number,
    date,
    merchant,
    inn,
    phone,
    clientName,
    plate,
    vin: vin ?? undefined,
    total,
    lines,
    totalsMatch: match,
    confidence,
  };
}
