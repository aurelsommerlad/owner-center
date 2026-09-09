import { notFound } from "next/navigation";
import { getCurrentOwner } from "@/services/ownerService";
import { getProperty } from "@/services/propertyService";
import { getPropertyOverviewKpis, getOccupancyPreview } from "@/services/overviewService";
import { getLatestStatements } from "@/services/statementService";
import { getDocumentsForProperty } from "@/services/documentService";
import { HeroSection } from "@/components/overview/HeroSection";
import { KpiCard } from "@/components/overview/KpiCard";
import { OccupancyPreviewCard } from "@/components/overview/OccupancyPreviewCard";
import { RecentStatements } from "@/components/overview/RecentStatements";
import { DocumentsPreview } from "@/components/overview/DocumentsPreview";
import { formatCurrency, formatPercent } from "@/lib/format";

export default async function UebersichtPage({
  params,
}: {
  params: Promise<{ propertyId: string }>;
}) {
  const { propertyId } = await params;
  const property = await getProperty(propertyId);
  if (!property) notFound();

  const [owner, kpis, preview, statements, documents] = await Promise.all([
    getCurrentOwner(),
    getPropertyOverviewKpis(propertyId),
    getOccupancyPreview(propertyId),
    getLatestStatements(propertyId, 2),
    getDocumentsForProperty(propertyId),
  ]);

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <HeroSection property={property} owner={owner} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Auslastung"
          value={formatPercent(kpis.occupancyPct)}
          deltaPoints={
            kpis.occupancyPctPreviousYear !== undefined
              ? kpis.occupancyPct - kpis.occupancyPctPreviousYear
              : undefined
          }
        />
        <KpiCard
          label="Umsatz"
          value={formatCurrency(kpis.revenue)}
          deltaPoints={
            kpis.revenuePreviousYear
              ? ((kpis.revenue - kpis.revenuePreviousYear) / kpis.revenuePreviousYear) * 100
              : undefined
          }
        />
        <KpiCard
          label="Buchungen"
          value={String(kpis.bookingsCount)}
          deltaPoints={
            kpis.bookingsCountPreviousYear !== undefined
              ? kpis.bookingsCount - kpis.bookingsCountPreviousYear
              : undefined
          }
          deltaLabel="Buchungen zum Vorjahr"
        />
        <KpiCard
          label="Ø Aufenthaltsdauer"
          value={`${kpis.avgStayNights.toFixed(1)} Nächte`}
          deltaPoints={
            kpis.avgStayNightsPreviousYear !== undefined
              ? kpis.avgStayNights - kpis.avgStayNightsPreviousYear
              : undefined
          }
          deltaLabel="Nächte zum Vorjahr"
        />
      </div>

      <OccupancyPreviewCard preview={preview} propertyId={propertyId} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RecentStatements statements={statements} propertyId={propertyId} />
        <DocumentsPreview documents={documents} propertyId={propertyId} />
      </div>
    </div>
  );
}
