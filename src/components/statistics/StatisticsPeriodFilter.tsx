"use client";

import { useRouter } from "next/navigation";
import type { StatisticsPeriod } from "@/services/statisticsService";
import { useTranslations } from "@/components/i18n/LocaleProvider";
import { monthLabel } from "@/lib/dates";

// Mock data is anchored to September 2026 (see lib/config.ts#MOCK_TODAY).
const MOCK_MONTH = 9;
const MOCK_YEAR = 2026;

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
  const { t, locale } = useTranslations();

  const options: Array<{ value: StatisticsPeriod; label: string }> = [
    { value: "month", label: `${monthLabel(MOCK_MONTH, locale)} ${MOCK_YEAR}` },
    { value: "ytd", label: `YTD ${MOCK_YEAR}` },
    { value: "year", label: t("overview.year", { year: MOCK_YEAR }) },
  ];

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="inline-flex items-center gap-0.5 rounded-full border border-line bg-paper p-1">
        {options.map((option) => {
          const active = option.value === period;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => router.push(`/${propertyId}/statistiken?zeitraum=${option.value}`)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                active ? "bg-ink text-paper" : "text-ink-soft hover:text-ink"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      <span className="text-xs text-ink-soft">
        {t("statistics.comparisonPeriod")} <span className="text-ink">{comparisonLabel}</span>
      </span>
    </div>
  );
}
