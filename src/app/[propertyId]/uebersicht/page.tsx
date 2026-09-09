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
import { MOCK_TODAY } from "@/lib/config";

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

  const todayDate = parseIsoDate(MOCK_TODAY);
  const periodLabel =
    period === "year"
      ? `Jahr ${todayDate.getUTCFullYear()}`
      : `${monthLabel(todayDate.getUTCMonth() + 1)} ${todayDate.getUTCFullYear()}`;

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

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <HeroSection property={property} periodLabel={periodLabel} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <PeriodFilter propertyId={propertyId} period={period} />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="Auslastung"
          value={formatPercent(kpis.occupancyPct)}
          deltaPoints={
            kpis.occupancyPctPreviousYear !== undefined
              ? kpis.occupancyPct - kpis.occupancyPctPreviousYear
              : undefined
          }
          deltaFractionDigits={1}
          deltaSuffix=" %"
          deltaLabel="zum Vorjahr"
        />
        <KpiCard
          label="Buchungsumsatz"
          value={formatCurrency(kpis.revenue)}
          deltaPoints={
            kpis.revenuePreviousYear
              ? ((kpis.revenue - kpis.revenuePreviousYear) / kpis.revenuePreviousYear) * 100
              : undefined
          }
          deltaFractionDigits={1}
          deltaSuffix=" %"
          deltaLabel="zum Vorjahr"
        />
        <KpiCard
          label="Buchungen"
          value={String(kpis.bookingsCount)}
          deltaPoints={
            kpis.bookingsCountPreviousYear !== undefined
              ? kpis.bookingsCount - kpis.bookingsCountPreviousYear
              : undefined
          }
          deltaFractionDigits={0}
          deltaLabel="Buchungen zum Vorjahr"
        />
        <KpiCard
          label="Ø Aufenthaltsdauer"
          value={`${formatNumber(kpis.avgStayNights, 1)} Nächte`}
          deltaPoints={
            kpis.avgStayNightsPreviousYear !== undefined
              ? kpis.avgStayNights - kpis.avgStayNightsPreviousYear
              : undefined
          }
          deltaFractionDigits={1}
          deltaLabel="Nächte zum Vorjahr"
        />
      </div>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <OccupancyPreviewCard preview={preview} propertyId={propertyId} />
        </div>
        <div className="flex flex-col gap-5">
          <TodayStatusCard status={todayStatus} />
          <ArrivalsDeparturesCard summary={arrivalsDepartures} propertyId={propertyId} />
        </div>
      </div>

      <UnitStatusOverviewCard overview={unitStatusOverview} propertyId={propertyId} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <RecentStatements statements={statements} propertyId={propertyId} />
        <DocumentsPreview documents={documents.slice(0, 4)} propertyId={propertyId} />
      </div>
    </div>
  );
}
