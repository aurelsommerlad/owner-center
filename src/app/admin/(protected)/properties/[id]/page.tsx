import Link from "next/link";
import { notFound } from "next/navigation";
import { getOwners } from "@/services/admin/ownerService";
import { getOwnersForProperty, getProperty } from "@/services/admin/propertyService";
import { Card } from "@/components/ui/Card";
import { AdminStatusBadge, propertyStatusBadge } from "@/components/admin/AdminStatusBadge";
import { PropertyFormModal } from "@/components/admin/PropertyFormModal";
import { ApaleoMappingCard } from "@/components/admin/ApaleoMappingCard";
import { formatShortDate } from "@/lib/format";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.08em] text-ink-soft">{label}</p>
      <p className="mt-1 text-sm text-ink">{value}</p>
    </div>
  );
}

// Property-ID / Drive folder IDs are mock configuration only - a real
// connection never exists yet, so this status is always "Noch nicht
// verbunden" regardless of whether a mock value is set. No fake sync state.
function NotConnectedBadge() {
  return <AdminStatusBadge label="Noch nicht verbunden" tone="muted" />;
}

export default async function AdminPropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const property = await getProperty(id);
  if (!property) notFound();

  const [owners, allOwners] = await Promise.all([getOwnersForProperty(property.id), getOwners()]);
  const statusBadge = propertyStatusBadge(property.status);

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div>
        <Link href="/admin/properties" className="text-xs font-medium text-ink-soft transition-colors hover:text-ink">
          ← Objekte
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-ink">{property.name}</h1>
            <p className="mt-1 text-sm text-ink-soft">{property.location}</p>
          </div>
          <PropertyFormModal
            property={property}
            owners={allOwners}
            ownerIds={owners.map((owner) => owner.id)}
            triggerLabel="Bearbeiten"
            triggerClassName="rounded-full border border-line px-4 py-2 text-xs font-medium text-ink-soft transition-colors hover:border-ink hover:text-ink"
          />
        </div>
      </div>

      {/* Objekt */}
      <Card className="grid grid-cols-2 gap-x-6 gap-y-5 p-5 shadow-soft sm:p-6 lg:grid-cols-4">
        <Field label="Objektname" value={property.name} />
        <Field label="Standort" value={property.location} />
        <Field label="Status" value={<AdminStatusBadge label={statusBadge.label} tone={statusBadge.tone} />} />
        <Field label="Zuletzt aktualisiert" value={formatShortDate(property.updatedAt)} />
      </Card>

      {/* Eigentümer & Zugriffe */}
      <Card className="p-5 shadow-soft sm:p-6">
        <h2 className="text-sm font-semibold text-ink">Eigentümer & Zugriffe</h2>
        <p className="mt-1 text-xs text-ink-soft">Welche Eigentümer haben Zugriff auf dieses Objekt?</p>
        <div className="mt-3 divide-y divide-line">
          {owners.length === 0 && <p className="py-3 text-sm text-ink-soft">Noch kein Eigentümer zugeordnet.</p>}
          {owners.map((owner) => (
            <div key={owner.id} className="flex items-center justify-between gap-3 py-3 text-sm">
              <Link href={`/admin/owners/${owner.id}`} className="text-ink transition-colors hover:text-ink-soft">
                {owner.name}
              </Link>
              {owner.companyName && <span className="text-xs text-ink-soft">{owner.companyName}</span>}
            </div>
          ))}
        </div>
      </Card>

      {/* apaleo */}
      <ApaleoMappingCard propertyId={property.id} apaleoPropertyId={property.apaleoPropertyId} />

      {/* Google Drive */}
      <Card className="p-5 shadow-soft sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-sm font-semibold text-ink">Google Drive</h2>
          <NotConnectedBadge />
        </div>
        <div className="mt-3 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
          <Field label="Abrechnungsordner" value={property.statementsDriveFolderId ?? "—"} />
          <Field label="Dokumentenordner" value={property.documentsDriveFolderId ?? "—"} />
        </div>
      </Card>
    </div>
  );
}
