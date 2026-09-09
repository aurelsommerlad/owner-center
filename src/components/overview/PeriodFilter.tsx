"use client";

import { useRouter } from "next/navigation";
import type { OverviewPeriod } from "@/services/overviewService";

const OPTIONS: Array<{ value: OverviewPeriod; label: string }> = [
  { value: "month", label: "September 2026" },
  { value: "year", label: "Jahr 2026" },
];

export function PeriodFilter({
  propertyId,
  period,
}: {
  propertyId: string;
  period: OverviewPeriod;
}) {
  const router = useRouter();

  return (
    <div className="inline-flex items-center gap-0.5 rounded-full border border-line bg-paper p-1">
      {OPTIONS.map((option) => {
        const active = option.value === period;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => router.push(`/${propertyId}/uebersicht?zeitraum=${option.value}`)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
              active ? "bg-primary-dark text-on-image" : "text-ink-soft hover:text-ink"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
