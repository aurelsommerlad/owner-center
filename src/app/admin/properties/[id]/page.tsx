import Link from "next/link";
import { notFound } from "next/navigation";
import { getOwnersForProperty, getProperty } from "@/services/admin/propertyService";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminStatusBadge, propertyStatusBadge } from "@/components/admin/AdminStatusBadge";
import { formatShortDate } from "@/lib/format";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-[#74736E]">{label}</p>
      <p className="mt-1 text-sm text-[#171817]">{value}</p>
    </div>
  );
}

export default async function AdminPropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const property = await getProperty(id);
  if (!property) notFound();

  const owners = await getOwnersForProperty(property.id);
  const statusBadge = propertyStatusBadge(property.status);

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div>
        <Link href="/admin/properties" className="text-xs font-medium text-[#74736E] hover:text-[#171817]">
          ← Objekte
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-[#171817]">{property.name}</h1>
        <p className="mt-1 text-sm text-[#74736E]">{property.location}</p>
      </div>

      <AdminCard className="grid grid-cols-2 gap-x-6 gap-y-5 p-5 sm:p-6 lg:grid-cols-4">
        <Field label="Objektname" value={property.name} />
        <Field label="Standort" value={property.location} />
        <Field label="Status" value={<AdminStatusBadge label={statusBadge.label} tone={statusBadge.tone} />} />
        <Field
          label="apaleo Property-ID"
          value={property.apaleoPropertyId ?? <span className="text-[#74736E]">Nicht verknüpft</span>}
        />
        <Field
          label="Eigentümer"
          value={
            owners.length > 0 ? (
              <span className="flex flex-wrap gap-x-1.5">
                {owners.map((owner, index) => (
                  <span key={owner.id}>
                    <Link href={`/admin/owners/${owner.id}`} className="hover:underline">
                      {owner.name}
                    </Link>
                    {index < owners.length - 1 && ","}
                  </span>
                ))}
              </span>
            ) : (
              "—"
            )
          }
        />
        <Field
          label="Drive-Ordner Abrechnungen"
          value={property.statementsDriveFolderId ?? <span className="text-[#74736E]">Nicht eingerichtet</span>}
        />
        <Field
          label="Drive-Ordner Dokumente"
          value={property.documentsDriveFolderId ?? <span className="text-[#74736E]">Nicht eingerichtet</span>}
        />
        <Field label="Erstellt am" value={formatShortDate(property.createdAt)} />
        <Field label="Zuletzt aktualisiert" value={formatShortDate(property.updatedAt)} />
      </AdminCard>
    </div>
  );
}
