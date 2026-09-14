import { notFound } from "next/navigation";
import { getProperty } from "@/services/propertyService";
import { getUnitsForProperty } from "@/services/unitService";
import { getPropertyStatistics, type StatisticsPeriod } from "@/services/statisticsService";
import { Card } from "@/components/ui/Card";
import { KpiCard } from "@/components/overview/KpiCard";
import { StatisticsPeriodFilter } from "@/components/statistics/StatisticsPeriodFilter";
import { TrendChart } from "@/components/statistics/TrendChart";
import { BookingSourceDonut } from "@/components/statistics/BookingSourceDonut";
import { BookingSourceTable } from "@/components/statistics/BookingSourceTable";
import { UnitPerformanceTable, type UnitPerformanceRow } from "@/components/statistics/UnitPerformanceTable";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import { hadOwnerPortalDataError } from "@/server/services/ownerPortal/errorState";
import { DataUnavailableNotice } from "@/components/ui/DataUnavailableNotice";
import { getOwnerLocale } from "@/server/locale";
import { getDictionary, createTranslator } from "@/i18n";

function percentDelta(value: number, previousYear: number): number | undefined {
  return previousYear > 0 ? ((value - previousYear) / previousYear) * 100 : undefined;
}

export default async function StatistikenPage({
  params,
  searchParams,
}: {
  params: Promise<{ propertyId: string }>;
  searchParams: Promise<{ zeitraum?: string }>;
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

  const [units, stats] = await Promise.all([
    getUnitsForProperty(propertyId),
    getPropertyStatistics(propertyId, period, locale),
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
  const years = [...revenueByYear.keys()].sort((a, b) => b - a);
  const [currentYear, previousYear] = years;

  const directSharePct = stats.bookingSources.find((source) => source.source === "direct")?.revenueShare ?? 0;
  const dataError = hadOwnerPortalDataError();

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl italic text-ink sm:text-3xl">{t("statistics.title")}</h1>
        <p className="mt-1 text-sm text-ink-soft">{t("statistics.subtitleFor", { name: property.name })}</p>
      </div>

      {dataError && <DataUnavailableNotice text={t("common.dataUnavailable")} />}

      <StatisticsPeriodFilter propertyId={propertyId} period={period} comparisonLabel={stats.comparisonLabel} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label={t("statistics.occupancy")}
          value={formatPercent(stats.occupancyPct.value, 0, locale)}
          deltaPoints={stats.occupancyPct.value - stats.occupancyPct.previousYear}
          deltaFractionDigits={1}
          deltaSuffix={locale === "en" ? "%" : " %"}
          deltaLabel={t("statistics.vsLastYear")}
          locale={locale}
        />
        <KpiCard
          label={t("statistics.bookingRevenue")}
          value={formatCurrency(stats.revenue.value, "EUR", 2, locale)}
          deltaPoints={percentDelta(stats.revenue.value, stats.revenue.previousYear)}
          deltaFractionDigits={1}
          deltaSuffix={locale === "en" ? "%" : " %"}
          deltaLabel={t("statistics.vsLastYear")}
          locale={locale}
        />
        <KpiCard
          label={t("statistics.adr")}
          value={formatCurrency(stats.adr.value, "EUR", 2, locale)}
          deltaPoints={percentDelta(stats.adr.value, stats.adr.previousYear)}
          deltaFractionDigits={1}
          deltaSuffix={locale === "en" ? "%" : " %"}
          deltaLabel={t("statistics.vsLastYear")}
          locale={locale}
        />
        <KpiCard
          label={t("statistics.revPar")}
          value={formatCurrency(stats.revPar.value, "EUR", 2, locale)}
          deltaPoints={percentDelta(stats.revPar.value, stats.revPar.previousYear)}
          deltaFractionDigits={1}
          deltaSuffix={locale === "en" ? "%" : " %"}
          deltaLabel={t("statistics.vsLastYear")}
          locale={locale}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          compact
          label={t("statistics.bookings")}
          value={String(stats.bookingsCount.value)}
          deltaPoints={stats.bookingsCount.value - stats.bookingsCount.previousYear}
          deltaFractionDigits={0}
          deltaLabel={t("statistics.bookingsVsLastYear")}
          locale={locale}
        />
        <KpiCard
          compact
          label={t("statistics.avgStay")}
          value={`${formatNumber(stats.avgStayNights.value, 1, locale)} ${t("statistics.nights")}`}
          deltaPoints={stats.avgStayNights.value - stats.avgStayNights.previousYear}
          deltaFractionDigits={1}
          deltaLabel={t("statistics.nightsVsLastYear")}
          locale={locale}
        />
        <KpiCard
          compact
          label={t("statistics.avgBookingValue")}
          value={formatCurrency(stats.avgBookingValue.value, "EUR", 2, locale)}
          deltaPoints={percentDelta(stats.avgBookingValue.value, stats.avgBookingValue.previousYear)}
          deltaFractionDigits={1}
          deltaSuffix={locale === "en" ? "%" : " %"}
          deltaLabel={t("statistics.vsLastYear")}
          locale={locale}
        />
        <KpiCard
          compact
          label={t("statistics.ownerPayout")}
          value={formatCurrency(stats.ownerPayout.value, "EUR", 2, locale)}
          deltaPoints={percentDelta(stats.ownerPayout.value, stats.ownerPayout.previousYear)}
          deltaFractionDigits={1}
          deltaSuffix={locale === "en" ? "%" : " %"}
          deltaLabel={t("statistics.ownerPayoutVsLastYear")}
          locale={locale}
        />
      </div>

      <Card className="p-5 shadow-none sm:p-6">
        <TrendChart
          title={t("statistics.revenueTrendTitle")}
          currentYear={currentYear}
          previousYear={previousYear}
          currentSeries={revenueByYear.get(currentYear) ?? []}
          previousSeries={revenueByYear.get(previousYear) ?? []}
          valueKind="currency"
        />
      </Card>

      <Card className="p-5 shadow-none sm:p-6">
        <TrendChart
          title={t("statistics.occupancyTrendTitle")}
          currentYear={currentYear}
          previousYear={previousYear}
          currentSeries={occupancyByYear.get(currentYear) ?? []}
          previousSeries={occupancyByYear.get(previousYear) ?? []}
          valueKind="percent"
          fixedMax={100}
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
