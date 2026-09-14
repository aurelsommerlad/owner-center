import { notFound } from "next/navigation";
import { getProperty } from "@/services/propertyService";
import { getUnitsForProperty } from "@/services/unitService";
import {
  getPropertyStatistics,
  recentStatisticsMonths,
  type StatisticsMonthOption,
  type StatisticsPeriod,
} from "@/services/statisticsService";
import type { ComparableMetric } from "@/types";
import { Card } from "@/components/ui/Card";
import { KpiCard } from "@/components/overview/KpiCard";
import { StatisticsPeriodFilter } from "@/components/statistics/StatisticsPeriodFilter";
import { TrendChart } from "@/components/statistics/TrendChart";
import { BookingSourceDonut } from "@/components/statistics/BookingSourceDonut";
import { BookingSourceTable } from "@/components/statistics/BookingSourceTable";
import { UnitPerformanceTable, type UnitPerformanceRow } from "@/components/statistics/UnitPerformanceTable";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import { parseIsoDate } from "@/lib/dates";
import { ownerPortalToday } from "@/server/services/ownerPortal/today";
import { hadOwnerPortalDataError } from "@/server/services/ownerPortal/errorState";
import { DataUnavailableNotice } from "@/components/ui/DataUnavailableNotice";
import { getOwnerLocale } from "@/server/locale";
import { getDictionary, createTranslator } from "@/i18n";

/** Percentage-points/count delta - only meaningful when the previous-year period actually has data. */
function pointDelta(metric: ComparableMetric): number | undefined {
  return metric.previousYearAvailable ? metric.value - metric.previousYear : undefined;
}

/** Relative (%) delta - same previous-year-data guard, plus the usual divide-by-zero guard. */
function percentDelta(metric: ComparableMetric): number | undefined {
  if (!metric.previousYearAvailable || metric.previousYear === 0) return undefined;
  return ((metric.value - metric.previousYear) / metric.previousYear) * 100;
}

export default async function StatistikenPage({
  params,
  searchParams,
}: {
  params: Promise<{ propertyId: string }>;
  searchParams: Promise<{ zeitraum?: string; monat?: string }>;
}) {
  const { propertyId } = await params;
  const query = await searchParams;
  const period: StatisticsPeriod =
    query.zeitraum === "year" ? "year" : query.zeitraum === "ytd" ? "ytd" : "month";

  const property = await getProperty(propertyId);
  if (!property) notFound();

  const locale = await getOwnerLocale();
  const dict = getDictionary(locale);
  const t = createTranslator(dict);

  const today = ownerPortalToday();
  const todayDate = parseIsoDate(today);
  const currentYear = todayDate.getUTCFullYear();
  const availableMonths = recentStatisticsMonths(today);

  // The requested month only takes effect when it's actually one of the
  // offered options (never in the future, never further back than the
  // dropdown reaches) - otherwise fall back to the current month, the same
  // way an invalid `view`/`zeitraum` elsewhere in the app falls back to a
  // safe default rather than erroring.
  const requestedMonth: StatisticsMonthOption | null = (() => {
    if (!query.monat || !/^\d{4}-\d{2}-\d{2}$/.test(query.monat)) return null;
    const date = parseIsoDate(query.monat);
    return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
  })();
  const selectedMonth: StatisticsMonthOption =
    requestedMonth && availableMonths.some((o) => o.year === requestedMonth.year && o.month === requestedMonth.month)
      ? requestedMonth
      : { year: currentYear, month: todayDate.getUTCMonth() + 1 };

  const [units, stats] = await Promise.all([
    getUnitsForProperty(propertyId),
    getPropertyStatistics(propertyId, period, locale, selectedMonth),
  ]);

  const unitRows: UnitPerformanceRow[] = units.map((unit) => ({
    unit,
    stats: stats.unitStats.find((entry) => entry.unitId === unit.id) ?? {
      unitId: unit.id,
      occupancyPct: 0,
      revenue: 0,
      adr: 0,
      revPar: 0,
      bookings: 0,
      avgStayNights: 0,
    },
  }));

  const revenueByYear = new Map<number, number[]>();
  for (const point of stats.monthlyRevenue) {
    const series = revenueByYear.get(point.year) ?? Array(12).fill(0);
    series[point.month - 1] = point.revenue;
    revenueByYear.set(point.year, series);
  }
  const occupancyByYear = new Map<number, number[]>();
  for (const point of stats.monthlyOccupancy) {
    const series = occupancyByYear.get(point.year) ?? Array(12).fill(0);
    series[point.month - 1] = point.occupancyPct;
    occupancyByYear.set(point.year, series);
  }
  const chartYears = [...revenueByYear.keys()].sort((a, b) => b - a);
  const [chartCurrentYear, chartPreviousYear] = chartYears;
  // The trend charts always show a full year - only worth marking the
  // selected month on them when that month actually falls within the year
  // they're showing (always true today; guards the cross-year case the
  // month dropdown's architecture already supports).
  const selectedMonthIndex =
    period === "month" && selectedMonth.year === chartCurrentYear ? selectedMonth.month - 1 : undefined;

  const directSharePct = stats.bookingSources.find((source) => source.source === "direct")?.revenueShare ?? 0;
  const dataError = hadOwnerPortalDataError();

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl italic text-ink sm:text-3xl">{t("statistics.title")}</h1>
        <p className="mt-1 text-sm text-ink-soft">{t("statistics.subtitleFor", { name: property.name })}</p>
      </div>

      {dataError && <DataUnavailableNotice text={t("common.dataUnavailable")} />}

      <StatisticsPeriodFilter
        propertyId={propertyId}
        period={period}
        comparisonLabel={stats.comparisonLabel}
        availableMonths={availableMonths}
        selectedMonth={selectedMonth}
        currentYear={currentYear}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label={t("statistics.occupancy")}
          value={formatPercent(stats.occupancyPct.value, 0, locale)}
          deltaPoints={pointDelta(stats.occupancyPct)}
          deltaFractionDigits={1}
          deltaSuffix={locale === "en" ? "%" : " %"}
          deltaLabel={t("statistics.vsLastYear")}
          noComparisonData={!stats.occupancyPct.previousYearAvailable}
          noComparisonDataLabel={t("statistics.noComparisonData")}
          locale={locale}
        />
        <KpiCard
          label={t("statistics.bookingRevenue")}
          value={formatCurrency(stats.revenue.value, "EUR", 2, locale)}
          deltaPoints={percentDelta(stats.revenue)}
          deltaFractionDigits={1}
          deltaSuffix={locale === "en" ? "%" : " %"}
          deltaLabel={t("statistics.vsLastYear")}
          noComparisonData={!stats.revenue.previousYearAvailable}
          noComparisonDataLabel={t("statistics.noComparisonData")}
          locale={locale}
        />
        <KpiCard
          label={t("statistics.adr")}
          value={formatCurrency(stats.adr.value, "EUR", 2, locale)}
          deltaPoints={percentDelta(stats.adr)}
          deltaFractionDigits={1}
          deltaSuffix={locale === "en" ? "%" : " %"}
          deltaLabel={t("statistics.vsLastYear")}
          noComparisonData={!stats.adr.previousYearAvailable}
          noComparisonDataLabel={t("statistics.noComparisonData")}
          locale={locale}
        />
        <KpiCard
          label={t("statistics.revPar")}
          value={formatCurrency(stats.revPar.value, "EUR", 2, locale)}
          deltaPoints={percentDelta(stats.revPar)}
          deltaFractionDigits={1}
          deltaSuffix={locale === "en" ? "%" : " %"}
          deltaLabel={t("statistics.vsLastYear")}
          noComparisonData={!stats.revPar.previousYearAvailable}
          noComparisonDataLabel={t("statistics.noComparisonData")}
          locale={locale}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          compact
          label={t("statistics.bookings")}
          value={String(stats.bookingsCount.value)}
          deltaPoints={pointDelta(stats.bookingsCount)}
          deltaFractionDigits={0}
          deltaLabel={t("statistics.bookingsVsLastYear")}
          noComparisonData={!stats.bookingsCount.previousYearAvailable}
          noComparisonDataLabel={t("statistics.noComparisonData")}
          locale={locale}
        />
        <KpiCard
          compact
          label={t("statistics.avgStay")}
          value={`${formatNumber(stats.avgStayNights.value, 1, locale)} ${t("statistics.nights")}`}
          deltaPoints={pointDelta(stats.avgStayNights)}
          deltaFractionDigits={1}
          deltaLabel={t("statistics.nightsVsLastYear")}
          noComparisonData={!stats.avgStayNights.previousYearAvailable}
          noComparisonDataLabel={t("statistics.noComparisonData")}
          locale={locale}
        />
        <KpiCard
          compact
          label={t("statistics.avgBookingValue")}
          value={formatCurrency(stats.avgBookingValue.value, "EUR", 2, locale)}
          deltaPoints={percentDelta(stats.avgBookingValue)}
          deltaFractionDigits={1}
          deltaSuffix={locale === "en" ? "%" : " %"}
          deltaLabel={t("statistics.vsLastYear")}
          noComparisonData={!stats.avgBookingValue.previousYearAvailable}
          noComparisonDataLabel={t("statistics.noComparisonData")}
          locale={locale}
        />
        <KpiCard
          compact
          label={t("statistics.ownerUseNights")}
          value={`${stats.ownerUseNights.value} ${t("statistics.nights")}`}
          deltaPoints={pointDelta(stats.ownerUseNights)}
          deltaFractionDigits={0}
          deltaLabel={t("statistics.nightsVsLastYear")}
          noComparisonData={!stats.ownerUseNights.previousYearAvailable}
          noComparisonDataLabel={t("statistics.noComparisonData")}
          locale={locale}
        />
      </div>

      <Card className="p-5 shadow-none sm:p-6">
        <TrendChart
          title={t("statistics.revenueTrendTitle")}
          currentYear={chartCurrentYear}
          previousYear={chartPreviousYear}
          currentSeries={revenueByYear.get(chartCurrentYear) ?? []}
          previousSeries={revenueByYear.get(chartPreviousYear) ?? []}
          valueKind="currency"
          selectedMonthIndex={selectedMonthIndex}
        />
      </Card>

      <Card className="p-5 shadow-none sm:p-6">
        <TrendChart
          title={t("statistics.occupancyTrendTitle")}
          currentYear={chartCurrentYear}
          previousYear={chartPreviousYear}
          currentSeries={occupancyByYear.get(chartCurrentYear) ?? []}
          previousSeries={occupancyByYear.get(chartPreviousYear) ?? []}
          valueKind="percent"
          fixedMax={100}
          selectedMonthIndex={selectedMonthIndex}
        />
      </Card>

      <Card className="p-5 shadow-none sm:p-6">
        <div>
          <h2 className="font-display text-lg italic text-ink">{t("statistics.bookingSources")}</h2>
          <p className="mt-1 text-sm text-ink-soft">{t("statistics.bookingSourcesSubtitle")}</p>
        </div>

        <div className="mt-5 flex flex-col gap-6 lg:flex-row lg:items-center lg:gap-10">
          <div className="flex justify-center lg:shrink-0">
            <BookingSourceDonut sources={stats.bookingSources} />
          </div>
          <div className="min-w-0 flex-1">
            <BookingSourceTable sources={stats.bookingSources} locale={locale} />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3 border-t border-line pt-5">
          <KpiCard compact label={t("statistics.directBookingShare")} value={formatPercent(directSharePct, 0, locale)} locale={locale} />
          <KpiCard compact label={t("statistics.avgLeadTime")} value={`${stats.avgLeadTimeDays} ${t("statistics.days")}`} locale={locale} />
          <KpiCard compact label={t("statistics.cancellationRate")} value={formatPercent(stats.cancellationRatePct, 1, locale)} locale={locale} />
        </div>
      </Card>

      <Card className="p-5 shadow-none sm:p-6">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="font-display text-lg italic text-ink">{t("statistics.unitPerformance")}</h2>
          <span className="text-[11px] text-ink-soft/70">{stats.unitStatsPeriodLabel}</span>
        </div>
        <div className="mt-4">
          <UnitPerformanceTable rows={unitRows} />
        </div>
      </Card>
    </div>
  );
}
