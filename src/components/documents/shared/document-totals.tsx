import { formatDocumentMoney } from "@/lib/documents/format";

import { docSectionTitle, docTotalsGrand, docTotalsRow } from "./document-tokens";

export type DocumentTotalLine = {
  label: string;
  value: number;
  emphasize?: boolean;
};

type DocumentTotalsProps = {
  lines: DocumentTotalLine[];
};

export function DocumentTotals({ lines }: DocumentTotalsProps) {
  return (
    <section className="ml-auto w-full max-w-sm">
      <h2 className={docSectionTitle}>Итого</h2>
      <div className="space-y-1">
        {lines.map((line) =>
          line.emphasize ? (
            <div key={line.label} className={docTotalsGrand}>
              <span>{line.label}</span>
              <span className="tabular-nums">{formatDocumentMoney(line.value)}</span>
            </div>
          ) : (
            <div key={line.label} className={docTotalsRow}>
              <span className="text-neutral-600">{line.label}</span>
              <span className="tabular-nums font-medium">{formatDocumentMoney(line.value)}</span>
            </div>
          ),
        )}
      </div>
    </section>
  );
}
