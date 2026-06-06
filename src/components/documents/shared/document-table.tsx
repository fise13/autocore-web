import { ReactNode } from "react";

import { docSectionTitle, docTable, docTd, docTh } from "./document-tokens";

export type DocumentTableColumn<T> = {
  key: string;
  header: string;
  align?: "left" | "right";
  render: (row: T) => ReactNode;
};

type DocumentTableProps<T> = {
  title?: string;
  columns: DocumentTableColumn<T>[];
  rows: T[];
  emptyLabel?: string;
};

export function DocumentTable<T>({ title, columns, rows, emptyLabel = "—" }: DocumentTableProps<T>) {
  return (
    <section>
      {title ? <h2 className={docSectionTitle}>{title}</h2> : null}
      <table className={docTable}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={docTh}
                style={{ textAlign: column.align ?? "left" }}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td className={docTd} colSpan={columns.length}>
                {emptyLabel}
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={index}>
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={docTd}
                    style={{ textAlign: column.align ?? "left" }}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </section>
  );
}
