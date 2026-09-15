"use client";

import { useRouter } from "next/navigation";
import type { OverviewPeriod } from "@/services/overviewService";
import { formatDateRange, startOfMonth } from "@/lib/dates";
import { useTranslations } from "@/components/i18n/LocaleProvider";
import { InfoTooltip } from "@/components/ui/InfoTooltip";

export function PeriodFilter({
  propertyId,
  period,
  year,
  today,
}: {
  propertyId: string;
  period: OverviewPeriod;
  /** Current year, as resolved server-side via ownerPortalToday(). */
  year: number;
  /** ISO "today" (real in production, MOCK_TODAY-anchored in local dev - see ownerPortalToday), only used to render the MTD tooltip's dynamic "1.–15. September 2026" range. */
  today: string;
}) {
  const router = useRouter();
  const { t, locale } = useTranslations();

  // Reuses the exact same MTD/Jahr wording already established on the
  // Statistiken page (statistics.*) - identical definitions, so no
  // duplicated i18n strings for the same concept (see AGENTS.md/the MTD
  // spec's "Texte nicht doppeln").
  const options: Array<{ value: OverviewPeriod; label: string; tooltipTitle: string; tooltipDescription: string }> = [
    {
      value: "mtd",
      label: t("statistics.mtd"),
      tooltipTitle: t("statistics.mtdTooltipTitle"),
      tooltipDescription: t("statistics.mtdTooltipDescription"),
    },
    {
      value: "year",
      label: t("overview.year", { year }),
      tooltipTitle: t("statistics.yearTooltipTitle"),
      tooltipDescription: t("statistics.yearTooltipDescription"),
    },
  ];

  return (
    <div className="inline-flex items-center gap-0.5 rounded-full border border-line bg-paper p-1">
      {options.map((option) => {
        const active = option.value === period;
        return (
          <span key={option.value} className="inline-flex items-center">
            <button
              type="button"
              aria-pressed={active}
              onClick={() => router.push(`/${propertyId}/uebersicht?zeitraum=${option.value}`)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                active ? "bg-ink text-paper" : "text-ink-soft hover:text-ink"
              }`}
            >
              {option.label}
            </button>
            <InfoTooltip
              label={t("common.moreInformation")}
              title={option.tooltipTitle}
              description={option.tooltipDescription}
              dateRangeLabel={option.value === "mtd" ? formatDateRange(startOfMonth(today), today, locale) : undefined}
              className="ml-0.5 mr-1"
            />
          </span>
        );
      })}
    </div>
  );
}
