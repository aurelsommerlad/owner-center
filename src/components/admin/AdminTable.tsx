import type { ReactNode } from "react";

export interface AdminTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
}

/**
 * Generic list/table primitive shared by every /admin list page (owners,
 * properties, ...) - callers only ever describe columns and rows, so a
 * later shared concern (sorting, pagination) can be added once, here.
 *
 * Styled after components/statistics/UnitPerformanceTable.tsx (same
 * border-line/text-ink/text-ink-soft tokens, same divide-line rows) rather
 * than a new table aesthetic.
 */
export function AdminTable<T>({
  columns,
  rows,
  rowKey,
  emptyMessage = "Keine Einträge vorhanden.",
}: {
  columns: AdminTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  emptyMessage?: string;
}) {
  if (rows.length === 0) {
    return <p className="px-1 py-8 text-center text-sm text-ink-soft">{emptyMessage}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-line text-left text-[11px] uppercase tracking-[0.06em] text-ink-soft">
            {columns.map((column) => (
              <th key={column.key} className={`px-3 py-2.5 font-medium ${column.className ?? ""}`}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((row) => (
            <tr key={rowKey(row)} className="text-ink transition-colors hover:bg-paper-dim">
              {columns.map((column) => (
                <td key={column.key} className={`px-3 py-3 align-middle ${column.className ?? ""}`}>
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
