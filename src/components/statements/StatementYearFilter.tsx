"use client";

import { useRouter } from "next/navigation";

export function StatementYearFilter({
  propertyId,
  years,
  selectedYear,
}: {
  propertyId: string;
  years: number[];
  selectedYear: number;
}) {
  const router = useRouter();

  return (
    <div className="inline-flex items-center gap-0.5 rounded-full border border-line bg-paper p-1">
      {years.map((year) => {
        const active = year === selectedYear;
        return (
          <button
            key={year}
            type="button"
            aria-pressed={active}
            onClick={() => router.push(`/${propertyId}/abrechnungen?jahr=${year}`)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
              active ? "bg-ink text-paper" : "text-ink-soft hover:text-ink"
            }`}
          >
            {year}
          </button>
        );
      })}
    </div>
  );
}
