import { getOwners } from "@/services/admin/ownerService";
import { getProperties } from "@/services/admin/propertyService";
import { getStatementDocuments, getStatementDocumentYears } from "@/services/admin/statementService";
import type { AdminStatementStatus } from "@/types/admin";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminStatementFilters } from "@/components/admin/AdminStatementFilters";
import { DocumentRow } from "@/components/admin/DocumentRow";
import { statementStatusBadge } from "@/components/admin/AdminStatusBadge";
import { ADMIN_DOCUMENT_TYPE_LABEL } from "@/lib/adminLabels";
import { monthLabel } from "@/lib/dates";
import { formatShortDate } from "@/lib/format";

const VALID_STATUSES: AdminStatementStatus[] = ["draft", "ready", "published", "updated"];

export default async function AdminStatementsPage({
  searchParams,
}: {
  searchParams: Promise<{ objekt?: string; jahr?: string; monat?: string; status?: string }>;
}) {
  const query = await searchParams;
  const [properties, owners, years] = await Promise.all([getProperties(), getOwners(), getStatementDocumentYears()]);

  const status = VALID_STATUSES.includes(query.status as AdminStatementStatus)
    ? (query.status as AdminStatementStatus)
    : undefined;

  const documents = await getStatementDocuments({
    propertyId: query.objekt,
    year: query.jahr ? Number(query.jahr) : undefined,
    month: query.monat ? Number(query.monat) : undefined,
    status,
  });

  const propertyName = (id: string) => properties.find((property) => property.id === id)?.name ?? id;
  const ownerName = (id: string) => owners.find((owner) => owner.id === id)?.name ?? id;

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#171817]">Abrechnungen</h1>
        <p className="mt-1 text-sm text-[#74736E]">Kontrolle der Monatsdokumente vor der Veröffentlichung.</p>
      </div>

      <AdminStatementFilters properties={properties} years={years} />

      <AdminCard className="p-5 sm:p-6">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold text-[#171817]">Dokumente</h2>
          <span className="text-xs text-[#74736E]">{documents.length} Dokumente</span>
        </div>

        {documents.length === 0 ? (
          <p className="mt-6 text-sm text-[#74736E]">Keine Dokumente für diese Filter.</p>
        ) : (
          <div className="mt-2 divide-y divide-[#E4E0D8]/70">
            {documents.map((document) => {
              const badge = statementStatusBadge(document.adminStatus);
              const providedLabel = document.publishedAt
                ? `Bereitgestellt ${formatShortDate(document.publishedAt)}`
                : "Noch nicht bereitgestellt";
              return (
                <DocumentRow
                  key={document.id}
                  title={ADMIN_DOCUMENT_TYPE_LABEL[document.documentType]}
                  subtitle={document.title}
                  meta={[
                    propertyName(document.propertyId),
                    ownerName(document.ownerId),
                    `${monthLabel(document.month)} ${document.year}`,
                    document.fileName,
                    providedLabel,
                  ]}
                  status={badge}
                  trailing={
                    <div className="hidden flex-col items-end gap-0.5 text-[11px] text-[#74736E] sm:flex">
                      <span>Version {document.version}</span>
                      <span>
                        {document.firstViewedAt ? "gesehen" : "ungesehen"} ·{" "}
                        {document.downloadCount > 0 ? `${document.downloadCount}× heruntergeladen` : "nicht heruntergeladen"}
                      </span>
                    </div>
                  }
                />
              );
            })}
          </div>
        )}
      </AdminCard>
    </div>
  );
}
