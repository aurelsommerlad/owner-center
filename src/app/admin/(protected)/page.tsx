import Link from "next/link";
import { getDashboardSummary } from "@/services/admin/dashboardService";
import { Card } from "@/components/ui/Card";
import { formatShortDate } from "@/lib/format";

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <Card className="px-4 py-3.5 shadow-none sm:px-5 sm:py-4">
      <p className="text-[11px] uppercase tracking-[0.08em] text-ink-soft">{label}</p>
      <p className="mt-1.5 text-2xl font-semibold text-ink">{value}</p>
    </Card>
  );
}

export default async function AdminDashboardPage() {
  const summary = await getDashboardSummary();

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Dashboard</h1>
        <p className="mt-1 text-sm text-ink-soft">Interner Überblick über Eigentümer, Objekte und Abrechnungen.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Aktive Eigentümer" value={summary.activeOwnersCount} />
        <StatTile label="Aktive Objekte" value={summary.activePropertiesCount} />
        <StatTile label="Veröffentlicht (Monat)" value={summary.publishedThisMonthCount} />
        <StatTile label="Neue / nicht zugeordnet" value={summary.unassignedDocumentsCount} />
      </div>

      <Link href="/admin/properties" className="block">
        <Card className="p-5 shadow-none transition-colors hover:border-ink sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-ink">apaleo-Mapping</h2>
            <span className="text-xs text-ink-soft">Zu den Objekten →</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-8 gap-y-1.5 text-sm text-ink-soft">
            <span>{summary.apaleoMapping.totalProperties} interne Properties</span>
            <span>{summary.apaleoMapping.connectedCount} mit apaleo verbunden</span>
            <span>{summary.apaleoMapping.openCount} nicht zugeordnet</span>
          </div>
        </Card>
      </Link>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-5 shadow-none sm:p-6">
          <h2 className="text-sm font-semibold text-ink">Zuletzt hinzugefügt</h2>

          <div className="mt-4">
            <p className="text-[11px] uppercase tracking-[0.08em] text-ink-soft">Eigentümer</p>
            <div className="mt-1.5 divide-y divide-line">
              {summary.recentOwners.map((owner) => (
                <div key={owner.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <Link href={`/admin/owners/${owner.id}`} className="text-ink transition-colors hover:text-ink-soft">
                    {owner.name}
                  </Link>
                  <span className="text-xs text-ink-soft">{formatShortDate(owner.createdAt)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <p className="text-[11px] uppercase tracking-[0.08em] text-ink-soft">Objekte</p>
            <div className="mt-1.5 divide-y divide-line">
              {summary.recentProperties.map((property) => (
                <div key={property.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <Link
                    href={`/admin/properties/${property.id}`}
                    className="text-ink transition-colors hover:text-ink-soft"
                  >
                    {property.name}
                  </Link>
                  <span className="text-xs text-ink-soft">{formatShortDate(property.createdAt)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <p className="text-[11px] uppercase tracking-[0.08em] text-ink-soft">Dokumente</p>
            <div className="mt-1.5 divide-y divide-line">
              {summary.recentDocuments.map((document) => (
                <div key={document.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="min-w-0 truncate text-ink">{document.title}</span>
                  <span className="shrink-0 text-xs text-ink-soft">{formatShortDate(document.createdAt)}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card className="p-5 shadow-none sm:p-6">
          <h2 className="text-sm font-semibold text-ink">Hinweise</h2>
          {summary.hints.length === 0 ? (
            <p className="mt-3 text-sm text-ink-soft">Keine offenen Hinweise.</p>
          ) : (
            <div className="mt-3 flex flex-col divide-y divide-line">
              {summary.hints.map((hint) => (
                <div key={hint.id} className="flex items-start gap-2.5 py-2.5 text-sm text-ink">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ink-soft" />
                  {hint.message}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
