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
import { getLatestStatements } from "@/services/statementService";
import { getDocumentsForProperty } from "@/services/documentService";
import { HeroSection } from "@/components/overview/HeroSection";
import { KpiCard } from "@/components/overview/KpiCard";
import { PeriodFilter } from "@/components/overview/PeriodFilter";
import { OccupancyPreviewCard } from "@/components/overview/OccupancyPreviewCard";
import { TodayStatusCard } from "@/components/overview/TodayStatusCard";
import { ArrivalsDeparturesCard } from "@/components/overview/ArrivalsDeparturesCard";
import { UnitStatusOverviewCard } from "@/components/overview/UnitStatusOverviewCard";
import { RecentStatements } from "@/components/overview/RecentStatements";
import { DocumentsPreview } from "@/components/overview/DocumentsPreview";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import { monthLabel, parseIsoDate } from "@/lib/dates";
import { ownerPortalToday } from "@/server/services/ownerPortal/today";
import { hadOwnerPortalDataError } from "@/server/services/ownerPortal/errorState";
import { DataUnavailableNotice } from "@/components/ui/DataUnavailableNotice";
import { getOwnerLocale } from "@/server/locale";
import { getDictionary, createTranslator, type TranslationKey } from "@/i18n";
import { getSignedInOwnerDisplayName } from "@/server/greeting";
import { timeOfDayInTimeZone, type TimeOfDay } from "@/lib/timezone";

/** Maps a time of day to its dictionary key - the only DE/EN-relevant choice here, and it selects a key, never text. */
const GREETING_SALUTATION_KEY: Record<TimeOfDay, TranslationKey> = {
  morning: "greeting.morning",
  afternoon: "greeting.afternoon",
  evening: "greeting.evening",
};

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

  // `null` for an admin's own session or an "Als Owner ansehen" preview (no
  // single specific OwnerUser to greet by name there) - falls back to a
  // neutral, nameless greeting rather than guessing.
  const ownerDisplayName = await getSignedInOwnerDisplayName();
  const greetingSalutation = t(GREETING_SALUTATION_KEY[timeOfDayInTimeZone(new Date())]);
  const greeting = ownerDisplayName ? `${greetingSalutation}, ${ownerDisplayName}` : greetingSalutation;

  const [kpis, preview, arrivalsDepartures, todayStatus, unitStatusOverview, statements, documents] =
    await Promise.all([
      getPropertyOverviewKpis(propertyId, period),
      getOccupancyPreview(propertyId),
      getArrivalsDeparturesSummary(propertyId),
      getTodayStatus(propertyId),
      getUnitStatusOverview(propertyId),
      getLatestStatements(propertyId, 1),
      getDocumentsForProperty(propertyId),
    ]);
  const dataError = hadOwnerPortalDataError();

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <HeroSection
        property={property}
        periodLabel={periodLabel}
        subtitle={t("overview.performanceOverview")}
        greeting={greeting}
      />
      {dataError && <DataUnavailableNotice text={t("common.dataUnavailable")} />}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <PeriodFilter propertyId={propertyId} period={period} />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label={t("overview.occupancy")}
          value={formatPercent(kpis.occupancyPct, 0, locale)}
          deltaPoints={
            kpis.occupancyPctPreviousYear !== undefined
              ? kpis.occupancyPct - kpis.occupancyPctPreviousYear
              : undefined
          }
          deltaFractionDigits={1}
          deltaSuffix={locale === "en" ? "%" : " %"}
          deltaLabel={t("overview.vsLastYear")}
          locale={locale}
        />
        <KpiCard
          label={t("overview.bookingRevenue")}
          value={formatCurrency(kpis.revenue, "EUR", 2, locale)}
          deltaPoints={
            kpis.revenuePreviousYear
              ? ((kpis.revenue - kpis.revenuePreviousYear) / kpis.revenuePreviousYear) * 100
              : undefined
          }
          deltaFractionDigits={1}
          deltaSuffix={locale === "en" ? "%" : " %"}
          deltaLabel={t("overview.vsLastYear")}
          locale={locale}
        />
        <KpiCard
          label={t("overview.bookings")}
          value={String(kpis.bookingsCount)}
          deltaPoints={
            kpis.bookingsCountPreviousYear !== undefined
              ? kpis.bookingsCount - kpis.bookingsCountPreviousYear
              : undefined
          }
          deltaFractionDigits={0}
          deltaLabel={t("overview.bookingsVsLastYear")}
          locale={locale}
        />
        <KpiCard
          label={t("overview.avgStay")}
          value={`${formatNumber(kpis.avgStayNights, 1, locale)} ${t("overview.nights")}`}
          deltaPoints={
            kpis.avgStayNightsPreviousYear !== undefined
              ? kpis.avgStayNights - kpis.avgStayNightsPreviousYear
              : undefined
          }
          deltaFractionDigits={1}
          deltaLabel={t("overview.nightsVsLastYear")}
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
        <RecentStatements statements={statements} propertyId={propertyId} locale={locale} />
        <DocumentsPreview documents={documents.slice(0, 4)} propertyId={propertyId} locale={locale} />
      </div>
    </div>
  );
}
