/**
 * Deterministic document classifier — keyword scoring over OCR text.
 * No AI. See docs/MOBILE-SCANNER-DESIGN.md §4.4.
 */

export type DocumentClass = 'invoice' | 'receipt' | 'waybill' | 'work-order' | 'unknown';

type ScoreMap = Record<Exclude<DocumentClass, 'unknown'>, number>;

const SIGNALS: Array<{ pattern: RegExp; scores: Partial<ScoreMap> }> = [
  { pattern: /сч[её]т\s+на\s+оплату|сч[её]т\s*№|инн|бин|кпп/i, scores: { invoice: 3 } },
  { pattern: /кассовый\s+чек|фискальн|\bфн\b|\bфд\b|\bфп\b/i, scores: { receipt: 3 } },
  { pattern: /накладн|торг-?12|отпустил|получил/i, scores: { waybill: 3 } },
  { pattern: /заказ-?наряд|автомобиль|работы\b|исполнитель/i, scores: { 'work-order': 3 } },
  { pattern: /кол-?во|количество|цена|сумма|ед\.?\s*изм/i, scores: { invoice: 1, receipt: 1, waybill: 1, 'work-order': 1 } },
  { pattern: /итого|к\s+оплате|всего\s+к\s+оплате/i, scores: { invoice: 1, receipt: 1, 'work-order': 1 } },
  { pattern: /[A-HJ-NPR-Z0-9]{17}/i, scores: { 'work-order': 2 } },
];

export function classifyDocument(text: string): DocumentClass {
  const scores: ScoreMap = { invoice: 0, receipt: 0, waybill: 0, 'work-order': 0 };

  for (const signal of SIGNALS) {
    if (!signal.pattern.test(text)) continue;
    for (const [key, value] of Object.entries(signal.scores) as Array<[keyof ScoreMap, number]>) {
      scores[key] += value;
    }
  }

  let best: DocumentClass = 'unknown';
  let bestScore = 0;
  for (const [key, value] of Object.entries(scores) as Array<[keyof ScoreMap, number]>) {
    if (value > bestScore) {
      bestScore = value;
      best = key;
    }
  }

  return bestScore >= 3 ? best : 'unknown';
}

export function documentClassLabel(kind: DocumentClass): string {
  switch (kind) {
    case 'invoice':
      return 'Счёт';
    case 'receipt':
      return 'Чек';
    case 'waybill':
      return 'Накладная';
    case 'work-order':
      return 'Заказ-наряд';
    default:
      return 'Документ';
  }
}
