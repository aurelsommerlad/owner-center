"use client";

import { useRouter } from "next/navigation";
import type { OverviewPeriod } from "@/services/overviewService";
import { monthLabel } from "@/lib/dates";
import { useTranslations } from "@/components/i18n/LocaleProvider";

// Mock data is anchored to September 2026 (see lib/config.ts#MOCK_TODAY) -
// only the label text is locale-aware, the underlying period is unchanged.
const MOCK_MONTH = 9;
const MOCK_YEAR = 2026;

export function PeriodFilter({
  propertyId,
  period,
}: {
  propertyId: string;
  period: OverviewPeriod;
}) {
  const router = useRouter();
  const { t, locale } = useTranslations();

  const options: Array<{ value: OverviewPeriod; label: string }> = [
    { value: "month", label: `${monthLabel(MOCK_MONTH, locale)} ${MOCK_YEAR}` },
    { value: "year", label: t("overview.year", { year: MOCK_YEAR }) },
  ];

  return (
    <div className="inline-flex items-center gap-0.5 rounded-full border border-line bg-paper p-1">
      {options.map((option) => {
        const active = option.value === period;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => router.push(`/${propertyId}/uebersicht?zeitraum=${option.value}`)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
              active ? "bg-ink text-paper" : "text-ink-soft hover:text-ink"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
