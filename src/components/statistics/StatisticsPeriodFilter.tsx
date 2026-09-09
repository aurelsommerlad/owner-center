"use client";

import { useRouter } from "next/navigation";
import type { StatisticsPeriod } from "@/services/statisticsService";

const OPTIONS: Array<{ value: StatisticsPeriod; label: string }> = [
  { value: "month", label: "September 2026" },
  { value: "ytd", label: "YTD 2026" },
  { value: "year", label: "Jahr 2026" },
];

export function StatisticsPeriodFilter({
  propertyId,
  period,
  comparisonLabel,
}: {
  propertyId: string;
  period: StatisticsPeriod;
  comparisonLabel: string;
}) {
  const router = useRouter();

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="inline-flex items-center gap-0.5 rounded-full border border-line bg-paper p-1">
        {OPTIONS.map((option) => {
          const active = option.value === period;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => router.push(`/${propertyId}/statistiken?zeitraum=${option.value}`)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                active ? "bg-primary-dark text-on-image" : "text-ink-soft hover:text-ink"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      <span className="text-xs text-ink-soft">
        Vergleichszeitraum: <span className="text-ink">{comparisonLabel}</span>
      </span>
    </div>
  );
}
