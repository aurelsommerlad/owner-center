import { notFound } from "next/navigation";
import { getProperty } from "@/services/propertyService";
import { getStatementDocuments, getStatementDocumentYears } from "@/services/statementDocumentService";
import { MOCK_TODAY } from "@/lib/config";
import { groupStatementDocumentsByMonth, isNewStatementDocument } from "@/lib/statementDocuments";
import { Card } from "@/components/ui/Card";
import { StatementYearFilter } from "@/components/statements/StatementYearFilter";
import { StatementMonthGroup } from "@/components/statements/StatementMonthGroup";

export default async function AbrechnungenPage({
  params,
  searchParams,
}: {
  params: Promise<{ propertyId: string }>;
  searchParams: Promise<{ jahr?: string }>;
}) {
  const { propertyId } = await params;
  const query = await searchParams;

  const property = await getProperty(propertyId);
  if (!property) notFound();

  const currentYear = Number(MOCK_TODAY.slice(0, 4));
  const years = await getStatementDocumentYears(propertyId);
  const requestedYear = Number(query.jahr);
  const selectedYear = years.includes(requestedYear) ? requestedYear : currentYear;

  const documents = await getStatementDocuments(propertyId, selectedYear);
  const monthGroups = groupStatementDocumentsByMonth(documents);
  const newCount = documents.filter(isNewStatementDocument).length;

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl italic text-ink sm:text-3xl">Abrechnungen</h1>
        <p className="mt-1 text-sm text-ink-soft">Ihre monatlichen Abrechnungen und Unterlagen im Überblick.</p>
      </div>

      <StatementYearFilter propertyId={propertyId} years={years} selectedYear={selectedYear} />

      <Card className="p-5 shadow-none sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-lg italic text-ink">Abrechnungen {selectedYear}</h2>
          <span className="text-xs text-ink-soft">
            {documents.length} {documents.length === 1 ? "Dokument" : "Dokumente"}
            {newCount > 0 ? ` · ${newCount} neu` : ""}
          </span>
        </div>

        {monthGroups.length === 0 ? (
          <p className="mt-6 text-sm text-ink-soft">Für {selectedYear} liegen noch keine Abrechnungen vor.</p>
        ) : (
          <div className="mt-1 divide-y divide-line">
            {monthGroups.map((group) => (
              <StatementMonthGroup key={`${group.year}-${group.month}`} group={group} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
