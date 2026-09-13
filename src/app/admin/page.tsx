import Link from "next/link";
import { getDashboardSummary } from "@/services/admin/dashboardService";
import { AdminCard } from "@/components/admin/AdminCard";
import { formatShortDate } from "@/lib/format";

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <AdminCard className="p-4">
      <p className="text-[11px] font-medium uppercase tracking-wide text-[#74736E]">{label}</p>
      <p className="mt-1.5 text-2xl font-semibold text-[#171817]">{value}</p>
    </AdminCard>
  );
}

export default async function AdminDashboardPage() {
  const summary = await getDashboardSummary();

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#171817]">Dashboard</h1>
        <p className="mt-1 text-sm text-[#74736E]">Interner Überblick über Eigentümer, Objekte und Abrechnungen.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Aktive Eigentümer" value={summary.activeOwnersCount} />
        <StatTile label="Aktive Objekte" value={summary.activePropertiesCount} />
        <StatTile label="Veröffentlicht (Monat)" value={summary.publishedThisMonthCount} />
        <StatTile label="Neue / nicht zugeordnet" value={summary.unassignedDocumentsCount} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AdminCard className="p-5">
          <h2 className="text-sm font-semibold text-[#171817]">Zuletzt hinzugefügt</h2>

          <div className="mt-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-[#74736E]">Eigentümer</p>
            <div className="mt-1.5 divide-y divide-[#E4E0D8]/70">
              {summary.recentOwners.map((owner) => (
                <div key={owner.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <Link href={`/admin/owners/${owner.id}`} className="text-[#171817] hover:underline">
                    {owner.name}
                  </Link>
                  <span className="text-xs text-[#74736E]">{formatShortDate(owner.createdAt)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-[#74736E]">Objekte</p>
            <div className="mt-1.5 divide-y divide-[#E4E0D8]/70">
              {summary.recentProperties.map((property) => (
                <div key={property.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <Link href={`/admin/properties/${property.id}`} className="text-[#171817] hover:underline">
                    {property.name}
                  </Link>
                  <span className="text-xs text-[#74736E]">{formatShortDate(property.createdAt)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-[#74736E]">Dokumente</p>
            <div className="mt-1.5 divide-y divide-[#E4E0D8]/70">
              {summary.recentDocuments.map((document) => (
                <div key={document.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="min-w-0 truncate text-[#171817]">{document.title}</span>
                  <span className="shrink-0 text-xs text-[#74736E]">{formatShortDate(document.createdAt)}</span>
                </div>
              ))}
            </div>
          </div>
        </AdminCard>

        <AdminCard className="p-5">
          <h2 className="text-sm font-semibold text-[#171817]">Hinweise</h2>
          {summary.hints.length === 0 ? (
            <p className="mt-3 text-sm text-[#74736E]">Keine offenen Hinweise.</p>
          ) : (
            <div className="mt-3 flex flex-col divide-y divide-[#E4E0D8]/70">
              {summary.hints.map((hint) => (
                <div key={hint.id} className="flex items-start gap-2.5 py-2.5 text-sm text-[#171817]">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#74736E]" />
                  {hint.message}
                </div>
              ))}
            </div>
          )}
        </AdminCard>
      </div>
    </div>
  );
}
