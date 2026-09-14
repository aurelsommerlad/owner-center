"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { StatisticsMonthOption, StatisticsPeriod } from "@/services/statisticsService";
import { useTranslations } from "@/components/i18n/LocaleProvider";
import { monthLabel } from "@/lib/dates";
import { ChevronDownIcon } from "@/components/ui/icons";

function isoFirstOfMonth(option: StatisticsMonthOption): string {
  return `${option.year}-${String(option.month).padStart(2, "0")}-01`;
}

/**
 * The Statistiken page's period control - a segmented pill row matching
 * every other filter in the app, except its first segment is itself a
 * dropdown (month picker) rather than a single fixed label. `availableMonths`
 * (newest first, no future months) and `currentYear` are resolved
 * server-side from the real "today" - see services/statisticsService.ts and
 * the page - so nothing here is hardcoded to a specific year.
 */
export function StatisticsPeriodFilter({
  propertyId,
  period,
  comparisonLabel,
  availableMonths,
  selectedMonth,
  currentYear,
}: {
  propertyId: string;
  period: StatisticsPeriod;
  comparisonLabel: string;
  availableMonths: StatisticsMonthOption[];
  selectedMonth: StatisticsMonthOption;
  currentYear: number;
}) {
  const router = useRouter();
  const { t, locale } = useTranslations();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function selectMonth(option: StatisticsMonthOption) {
    setOpen(false);
    router.push(`/${propertyId}/statistiken?zeitraum=month&monat=${isoFirstOfMonth(option)}`);
  }

  function selectPeriod(value: "ytd" | "year") {
    setOpen(false);
    router.push(`/${propertyId}/statistiken?zeitraum=${value}`);
  }

  // Grouped by year, newest year first - only visibly matters once the
  // trailing window spans a year boundary (see recentStatisticsMonths).
  const monthsByYear = new Map<number, StatisticsMonthOption[]>();
  for (const option of availableMonths) {
    const bucket = monthsByYear.get(option.year) ?? [];
    bucket.push(option);
    monthsByYear.set(option.year, bucket);
  }
  const years = [...monthsByYear.keys()].sort((a, b) => b - a);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="inline-flex items-center gap-0.5 rounded-full border border-line bg-paper p-1">
        <div className="relative" ref={containerRef}>
          <button
            type="button"
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-pressed={period === "month"}
            onClick={() => setOpen((value) => !value)}
            className={`flex items-center gap-1 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
              period === "month" ? "bg-ink text-paper" : "text-ink-soft hover:text-ink"
            }`}
          >
            {monthLabel(selectedMonth.month, locale)} {selectedMonth.year}
            <ChevronDownIcon className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
          </button>

          {open && (
            <div
              role="listbox"
              aria-label={t("statistics.selectMonth")}
              className="absolute left-0 z-30 mt-2 max-h-72 w-44 overflow-y-auto rounded-2xl border border-line bg-paper py-1.5 shadow-soft-lg"
            >
              {years.map((year) => (
                <div key={year}>
                  {years.length > 1 && (
                    <p className="px-3.5 pb-1 pt-2 text-[10px] font-medium uppercase tracking-wide text-ink-soft/70">
                      {year}
                    </p>
                  )}
                  {monthsByYear.get(year)!.map((option) => {
                    const active =
                      period === "month" && option.year === selectedMonth.year && option.month === selectedMonth.month;
                    return (
                      <button
                        key={`${option.year}-${option.month}`}
                        type="button"
                        role="option"
                        aria-selected={active}
                        onClick={() => selectMonth(option)}
                        className={`flex w-full items-center px-3.5 py-2 text-left text-sm transition-colors hover:bg-paper-dim ${
                          active ? "bg-paper-dim font-medium text-ink" : "text-ink-soft"
                        }`}
                      >
                        {monthLabel(option.month, locale)} {option.year}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          aria-pressed={period === "ytd"}
          onClick={() => selectPeriod("ytd")}
          className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
            period === "ytd" ? "bg-ink text-paper" : "text-ink-soft hover:text-ink"
          }`}
        >
          YTD {currentYear}
        </button>
        <button
          type="button"
          aria-pressed={period === "year"}
          onClick={() => selectPeriod("year")}
          className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
            period === "year" ? "bg-ink text-paper" : "text-ink-soft hover:text-ink"
          }`}
        >
          {t("overview.year", { year: currentYear })}
        </button>
      </div>
      <span className="text-xs text-ink-soft">
        {t("statistics.comparisonPeriod")} <span className="text-ink">{comparisonLabel}</span>
      </span>
    </div>
  );
}
