import type { KnowledgePatternKind } from "@/domain/knowledge/types";

export type BuildExplanationParams = {
  kind: KnowledgePatternKind;
  /** Human-readable subject of the pattern (engine code, sku, field name, query, ...). */
  key: string;
  /** support / total, as a 0..1 ratio. */
  rate: number;
  support: number;
  windowDays?: number;
};

function windowSuffix(windowDays?: number): string {
  return windowDays ? ` за последние ${windowDays} дн.` : "";
}

function pluralizeObservations(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 14) return `${count} раз`;
  if (mod10 === 1) return `${count} раз`;
  if (mod10 >= 2 && mod10 <= 4) return `${count} раза`;
  return `${count} раз`;
}

/** Compose a short, human-facing Russian explanation for why a pattern was suggested. */
export function buildExplanation({ kind, key, rate, support, windowDays }: BuildExplanationParams): string {
  const percent = Math.round(Math.max(0, Math.min(1, rate)) * 100);
  const observed = pluralizeObservations(support);
  const window = windowSuffix(windowDays);

  switch (kind) {
    case "kit":
      return `В ${percent}% нарядов с «${key}» также использовали эту деталь — подтверждено ${observed}${window}`;
    case "cooccur":
      return `Эти позиции покупают вместе в ${percent}% случаев (${observed}${window})`;
    case "fbt":
      return `Клиенты, которые берут «${key}», в ${percent}% случаев берут и эту позицию (${observed}${window})`;
    case "field":
      return `Значение «${key}» подходит в ${percent}% похожих случаев (${observed}${window})`;
    case "client_prefs":
      return `Этот клиент выбирал «${key}» в ${percent}% предыдущих заказов (${observed}${window})`;
    case "mechanic":
      return `Механик обычно использует «${key}» на этом двигателе — в ${percent}% нарядов (${observed}${window})`;
    case "docpack":
      return `С документом «${key}» в ${percent}% случаев печатают и этот комплект (${observed}${window})`;
    case "import_rule":
      return `При импорте значение «${key}» так исправляли в ${percent}% случаев (${observed}${window})`;
    case "ocr_confirm":
      return `Распознанный текст «${key}» подтверждали так в ${percent}% случаев (${observed}${window})`;
    case "search_boost":
      return `По запросу «${key}» этот результат выбирают в ${percent}% поисков (${observed}${window})`;
    case "stock_codeplete":
      return `Остаток «${key}» обычно заканчивается вместе с этой позицией — в ${percent}% случаев (${observed}${window})`;
    default:
      return `Замечена закономерность «${key}»: подтверждена в ${percent}% случаев (${observed}${window})`;
  }
}
