import { docBody } from "./document-tokens";

export type DocumentMetaItem = {
  label: string;
  value: string;
};

type DocumentMetaGridProps = {
  items: DocumentMetaItem[];
  columns?: 2 | 3;
};

export function DocumentMetaGrid({ items, columns = 2 }: DocumentMetaGridProps) {
  return (
    <div
      className="doc-meta-grid grid gap-3"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {items.map((item) => (
        <div key={item.label} className="doc-meta-card min-w-0 rounded-xl border border-neutral-200/80 bg-neutral-50/70 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-500">{item.label}</p>
          <p className={`${docBody} mt-1 font-medium text-neutral-900`}>{item.value || "—"}</p>
        </div>
      ))}
    </div>
  );
}
