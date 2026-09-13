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
    return <p className="px-1 py-8 text-center text-sm text-[#74736E]">{emptyMessage}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-[#E4E0D8] text-left text-[11px] font-medium uppercase tracking-wide text-[#74736E]">
            {columns.map((column) => (
              <th key={column.key} className={`px-3 py-2.5 font-medium ${column.className ?? ""}`}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E4E0D8]/70">
          {rows.map((row) => (
            <tr key={rowKey(row)} className="text-[#171817] transition-colors hover:bg-[#F8F6F1]/70">
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
