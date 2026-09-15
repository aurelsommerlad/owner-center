import { notFound } from "next/navigation";
import { getProperty } from "@/services/propertyService";
import {
  getPropertyOverviewKpis,
  getOccupancyPreview,
  getArrivalsDeparturesSummary,
  getTodayStatus,
  getUnitStatusOverview,
  type OverviewPeriod,
} from "@/services/overviewService";
import { getLatestStatementMonthDocuments } from "@/services/statementDocumentService";
import { hadStatementDataError } from "@/services/statementDataError";
import { groupStatementDocumentsByMonth } from "@/lib/statementDocuments";
import { HeroSection } from "@/components/overview/HeroSection";
import { KpiCard } from "@/components/overview/KpiCard";
import { PeriodFilter } from "@/components/overview/PeriodFilter";
import { OccupancyPreviewCard } from "@/components/overview/OccupancyPreviewCard";
import { TodayStatusCard } from "@/components/overview/TodayStatusCard";
import { ArrivalsDeparturesCard } from "@/components/overview/ArrivalsDeparturesCard";
import { UnitStatusOverviewCard } from "@/components/overview/UnitStatusOverviewCard";
import { RecentStatements } from "@/components/overview/RecentStatements";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import { monthLabel, parseIsoDate } from "@/lib/dates";
import { ownerPortalToday } from "@/server/services/ownerPortal/today";
import { hadOwnerPortalDataError } from "@/server/services/ownerPortal/errorState";
import { DataUnavailableNotice } from "@/components/ui/DataUnavailableNotice";
import { getOwnerLocale } from "@/server/locale";
import { getDictionary, createTranslator } from "@/i18n";

export default async function UebersichtPage({
  params,
  searchParams,
}: {
  params: Promise<{ propertyId: string }>;
  searchParams: Promise<{ zeitraum?: string }>;
}) {
  const { propertyId } = await params;
  const query = await searchParams;
  const period: OverviewPeriod = query.zeitraum === "year" ? "year" : "month";

  const property = await getProperty(propertyId);
  if (!property) notFound();

  const locale = await getOwnerLocale();
  const dict = getDictionary(locale);
  const t = createTranslator(dict);

  const todayDate = parseIsoDate(ownerPortalToday());
  const periodLabel =
    period === "year"
      ? t("overview.year", { year: todayDate.getUTCFullYear() })
      : `${monthLabel(todayDate.getUTCMonth() + 1, locale)} ${todayDate.getUTCFullYear()}`;

  const [kpis, preview, arrivalsDepartures, todayStatus, unitStatusOverview, latestStatementDocuments] =
    await Promise.all([
      getPropertyOverviewKpis(propertyId, period),
      getOccupancyPreview(propertyId),
      getArrivalsDeparturesSummary(propertyId),
      getTodayStatus(propertyId),
      getUnitStatusOverview(propertyId),
      getLatestStatementMonthDocuments(propertyId),
    ]);
  const dataError = hadOwnerPortalDataError() || hadStatementDataError();
  const latestStatementGroup = groupStatementDocumentsByMonth(latestStatementDocuments)[0] ?? null;

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <div className="flex flex-col gap-3">
        <HeroSection property={property} periodLabel={periodLabel} subtitle={t("overview.performanceOverview")} />
        {dataError && <DataUnavailableNotice text={t("common.dataUnavailable")} />}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <PeriodFilter
            propertyId={propertyId}
            period={period}
            month={todayDate.getUTCMonth() + 1}
            year={todayDate.getUTCFullYear()}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label={t("overview.occupancy")}
          value={formatPercent(kpis.occupancyPct, 0, locale)}
          deltaPoints={
            kpis.previousYearAvailable && kpis.occupancyPctPreviousYear !== undefined
              ? kpis.occupancyPct - kpis.occupancyPctPreviousYear
              : undefined
          }
          deltaFractionDigits={1}
          deltaSuffix={locale === "en" ? "%" : " %"}
          deltaLabel={t("overview.vsLastYear")}
          noComparisonData={!kpis.previousYearAvailable}
          noComparisonDataLabel={t("statistics.noComparisonData")}
          locale={locale}
        />
        <KpiCard
          label={t("overview.bookingRevenue")}
          value={formatCurrency(kpis.revenue, "EUR", 2, locale)}
          deltaPoints={
            kpis.previousYearAvailable && kpis.revenuePreviousYear
              ? ((kpis.revenue - kpis.revenuePreviousYear) / kpis.revenuePreviousYear) * 100
              : undefined
          }
          deltaFractionDigits={1}
          deltaSuffix={locale === "en" ? "%" : " %"}
          deltaLabel={t("overview.vsLastYear")}
          noComparisonData={!kpis.previousYearAvailable}
          noComparisonDataLabel={t("statistics.noComparisonData")}
          locale={locale}
        />
        <KpiCard
          label={t("overview.bookings")}
          value={String(kpis.bookingsCount)}
          deltaPoints={
            kpis.previousYearAvailable && kpis.bookingsCountPreviousYear !== undefined
              ? kpis.bookingsCount - kpis.bookingsCountPreviousYear
              : undefined
          }
          deltaFractionDigits={0}
          deltaLabel={t("overview.bookingsVsLastYear")}
          noComparisonData={!kpis.previousYearAvailable}
          noComparisonDataLabel={t("statistics.noComparisonData")}
          locale={locale}
        />
        <KpiCard
          label={t("overview.avgStay")}
          value={`${formatNumber(kpis.avgStayNights, 1, locale)} ${t("overview.nights")}`}
          deltaPoints={
            kpis.previousYearAvailable && kpis.avgStayNightsPreviousYear !== undefined
              ? kpis.avgStayNights - kpis.avgStayNightsPreviousYear
              : undefined
          }
          deltaFractionDigits={1}
          deltaLabel={t("overview.nightsVsLastYear")}
          noComparisonData={!kpis.previousYearAvailable}
          noComparisonDataLabel={t("statistics.noComparisonData")}
          locale={locale}
        />
      </div>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <OccupancyPreviewCard preview={preview} propertyId={propertyId} today={ownerPortalToday()} locale={locale} />
        </div>
        <div className="flex flex-col gap-5">
          <TodayStatusCard status={todayStatus} locale={locale} />
          <ArrivalsDeparturesCard
            summary={arrivalsDepartures}
            propertyId={propertyId}
            today={ownerPortalToday()}
            locale={locale}
          />
        </div>
      </div>

      <UnitStatusOverviewCard overview={unitStatusOverview} propertyId={propertyId} locale={locale} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <RecentStatements group={latestStatementGroup} propertyId={propertyId} locale={locale} />
      </div>
    </div>
  );
}
