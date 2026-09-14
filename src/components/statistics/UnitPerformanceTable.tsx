"use client";

import { useState } from "react";
import type { Unit, UnitStatistics } from "@/types";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import { useTranslations } from "@/components/i18n/LocaleProvider";

export interface UnitPerformanceRow {
  unit: Unit;
  stats: UnitStatistics;
}

type SortKey = "name" | "occupancyPct" | "revenue" | "adr" | "revPar" | "bookings" | "avgStayNights";

export function UnitPerformanceTable({ rows }: { rows: UnitPerformanceRow[] }) {
  const { locale, t } = useTranslations();
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [direction, setDirection] = useState<1 | -1>(1);

  const columns: Array<{ key: SortKey; label: string }> = [
    { key: "name", label: t("statistics.unit") },
    { key: "occupancyPct", label: t("statistics.occupancy") },
    { key: "revenue", label: t("statistics.bookingRevenue") },
    { key: "adr", label: t("statistics.adr") },
    { key: "revPar", label: t("statistics.revPar") },
    { key: "bookings", label: t("statistics.bookings") },
    { key: "avgStayNights", label: t("statistics.avgStay") },
  ];

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setDirection((current) => (current === 1 ? -1 : 1));
    } else {
      setSortKey(key);
      setDirection(1);
    }
  }

  const sorted = [...rows].sort((a, b) => {
    const result =
      sortKey === "name" ? a.unit.sortOrder - b.unit.sortOrder : a.stats[sortKey] - b.stats[sortKey];
    return result * direction;
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-line text-left text-[11px] uppercase tracking-[0.06em] text-ink-soft">
            {columns.map((column, index) => (
              <th key={column.key} className={`py-2.5 font-medium ${index > 0 ? "text-right" : ""}`}>
                <button
                  type="button"
                  onClick={() => toggleSort(column.key)}
                  className={`inline-flex items-center gap-1 transition-colors hover:text-ink ${
                    sortKey === column.key ? "text-ink" : ""
                  } ${index > 0 ? "flex-row-reverse" : ""}`}
                >
                  {column.label}
                  {sortKey === column.key && <span aria-hidden="true">{direction === 1 ? "↑" : "↓"}</span>}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {sorted.map(({ unit, stats }) => (
            <tr key={unit.id}>
              <td className="whitespace-nowrap py-3 font-medium text-ink">{unit.name}</td>
              <td className="whitespace-nowrap py-3 text-right text-ink-soft">
                {formatPercent(stats.occupancyPct, 0, locale)}
              </td>
              <td className="whitespace-nowrap py-3 text-right text-ink-soft">
                {formatCurrency(stats.revenue, "EUR", 2, locale)}
              </td>
              <td className="whitespace-nowrap py-3 text-right text-ink-soft">
                {formatCurrency(stats.adr, "EUR", 2, locale)}
              </td>
              <td className="whitespace-nowrap py-3 text-right text-ink-soft">
                {formatCurrency(stats.revPar, "EUR", 2, locale)}
              </td>
              <td className="whitespace-nowrap py-3 text-right text-ink-soft">{stats.bookings}</td>
              <td className="whitespace-nowrap py-3 text-right text-ink-soft">
                {formatNumber(stats.avgStayNights, 1, locale)} {t("statistics.nights")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
