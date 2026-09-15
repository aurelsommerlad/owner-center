"use client";

import { useRouter } from "next/navigation";
import type { OverviewPeriod } from "@/services/overviewService";
import { monthLabel } from "@/lib/dates";
import { useTranslations } from "@/components/i18n/LocaleProvider";

export function PeriodFilter({
  propertyId,
  period,
  month,
  year,
}: {
  propertyId: string;
  period: OverviewPeriod;
  /** Current month (1-12) and year, as resolved server-side via ownerPortalToday(). */
  month: number;
  year: number;
}) {
  const router = useRouter();
  const { t, locale } = useTranslations();

  const options: Array<{ value: OverviewPeriod; label: string }> = [
    { value: "month", label: `${monthLabel(month, locale)} ${year}` },
    { value: "year", label: t("overview.year", { year }) },
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
