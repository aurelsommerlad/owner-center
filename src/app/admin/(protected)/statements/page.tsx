import { getProperties } from "@/services/admin/propertyService";
import { getStatementMonthGroups, getStatementDocumentYears } from "@/services/admin/statementService";
import { Card } from "@/components/ui/Card";
import { AdminStatementFilters } from "@/components/admin/AdminStatementFilters";
import { StatementMonthCard } from "@/components/admin/StatementMonthCard";
import { GoogleDriveSyncButton } from "@/components/admin/GoogleDriveSyncButton";
import type { AdminStatementMonthGroup } from "@/types/admin";

export default async function AdminStatementsPage({
  searchParams,
}: {
  searchParams: Promise<{ objekt?: string; jahr?: string }>;
}) {
  const query = await searchParams;
  const [properties, years] = await Promise.all([getProperties(), getStatementDocumentYears()]);

  const monthGroups = await getStatementMonthGroups({
    propertyId: query.objekt,
    year: query.jahr ? Number(query.jahr) : undefined,
  });

  const groupsByProperty = new Map<string, AdminStatementMonthGroup[]>();
  for (const group of monthGroups) {
    const bucket = groupsByProperty.get(group.propertyId) ?? [];
    bucket.push(group);
    groupsByProperty.set(group.propertyId, bucket);
  }

  const propertyName = (id: string) => properties.find((property) => property.id === id)?.name ?? id;
  // Properties in their normal order, but only those with at least one
  // month currently in the (non-archived) set - an unmapped or never-synced
  // property simply never shows up here.
  const propertyIdsWithGroups = properties.map((property) => property.id).filter((id) => groupsByProperty.has(id));

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Dokumente</h1>
          <p className="mt-1 text-sm text-ink-soft">Monatsdokumente je Objekt prüfen und veröffentlichen.</p>
        </div>
        <GoogleDriveSyncButton />
      </div>

      <AdminStatementFilters properties={properties} years={years} />

      {propertyIdsWithGroups.length === 0 ? (
        <Card className="p-5 shadow-soft sm:p-6">
          <p className="text-sm text-ink-soft">Keine Dokumente für diese Filter.</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-6">
          {propertyIdsWithGroups.map((propertyId) => (
            <div key={propertyId} className="flex flex-col gap-3">
              <h2 className="font-display text-lg italic text-ink">{propertyName(propertyId)}</h2>
              <div className="flex flex-col gap-3">
                {(groupsByProperty.get(propertyId) ?? []).map((group) => (
                  <StatementMonthCard key={`${group.year}-${group.month}`} group={group} properties={properties} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
