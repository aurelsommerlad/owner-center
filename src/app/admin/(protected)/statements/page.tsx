import Link from "next/link";
import { getOwners } from "@/services/admin/ownerService";
import { getProperties } from "@/services/admin/propertyService";
import {
  getStatementDocuments,
  getStatementDocumentYears,
  type StatementDocumentView,
} from "@/services/admin/statementService";
import type { AdminStatementStatus } from "@/types/admin";
import { Card } from "@/components/ui/Card";
import { AdminStatementFilters } from "@/components/admin/AdminStatementFilters";
import { StatementDocumentAdminRow } from "@/components/admin/StatementDocumentAdminRow";
import { GoogleDriveSyncButton } from "@/components/admin/GoogleDriveSyncButton";

const VALID_STATUSES: AdminStatementStatus[] = [
  "draft",
  "ready",
  "detected",
  "needs_classification",
  "published",
  "updated",
  "archived",
];

const VIEW_TABS: Array<{ value: StatementDocumentView; param: string; label: string }> = [
  { value: "all", param: "alle", label: "Alle" },
  { value: "needs_review", param: "pruefen", label: "Zu prüfen" },
  { value: "published", param: "veroeffentlicht", label: "Veröffentlicht" },
];

function viewFromParam(param: string | undefined): StatementDocumentView {
  return VIEW_TABS.find((tab) => tab.param === param)?.value ?? "all";
}

export default async function AdminStatementsPage({
  searchParams,
}: {
  searchParams: Promise<{ objekt?: string; jahr?: string; monat?: string; status?: string; ansicht?: string }>;
}) {
  const query = await searchParams;
  const [properties, owners, years] = await Promise.all([getProperties(), getOwners(), getStatementDocumentYears()]);

  const status = VALID_STATUSES.includes(query.status as AdminStatementStatus)
    ? (query.status as AdminStatementStatus)
    : undefined;
  const view = viewFromParam(query.ansicht);

  const documents = await getStatementDocuments({
    propertyId: query.objekt,
    year: query.jahr ? Number(query.jahr) : undefined,
    month: query.monat ? Number(query.monat) : undefined,
    status,
    view,
  });

  const propertyName = (id: string) => properties.find((property) => property.id === id)?.name ?? id;
  const ownerName = (id: string | undefined) => (id ? (owners.find((owner) => owner.id === id)?.name ?? id) : "—");

  const otherParams = new URLSearchParams();
  if (query.objekt) otherParams.set("objekt", query.objekt);
  if (query.jahr) otherParams.set("jahr", query.jahr);
  if (query.monat) otherParams.set("monat", query.monat);
  if (query.status) otherParams.set("status", query.status);

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Abrechnungen</h1>
          <p className="mt-1 text-sm text-ink-soft">Kontrolle der Monatsdokumente vor der Veröffentlichung.</p>
        </div>
        <GoogleDriveSyncButton />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {VIEW_TABS.map((tab) => {
          const params = new URLSearchParams(otherParams);
          if (tab.param !== "alle") params.set("ansicht", tab.param);
          const href = params.toString() ? `?${params.toString()}` : "";
          const active = view === tab.value;
          return (
            <Link
              key={tab.value}
              href={href || "/admin/statements"}
              className={`rounded-full px-3.5 py-2 text-xs font-medium transition-colors ${
                active ? "bg-ink text-paper" : "border border-line text-ink-soft hover:border-ink hover:text-ink"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      <AdminStatementFilters properties={properties} years={years} />

      <Card className="p-5 shadow-soft sm:p-6">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold text-ink">Dokumente</h2>
          <span className="text-xs text-ink-soft">{documents.length} Dokumente</span>
        </div>

        {documents.length === 0 ? (
          <p className="mt-6 text-sm text-ink-soft">Keine Dokumente für diese Filter.</p>
        ) : (
          <div className="mt-2 divide-y divide-line">
            {documents.map((document) => (
              <StatementDocumentAdminRow
                key={document.id}
                document={document}
                propertyName={propertyName(document.propertyId)}
                ownerName={ownerName(document.ownerId)}
                properties={properties}
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
