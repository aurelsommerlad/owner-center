import Link from "next/link";
import { getOwners } from "@/services/admin/ownerService";
import { getOwnersForProperty, getProperties } from "@/services/admin/propertyService";
import { Card } from "@/components/ui/Card";
import { AdminTable, type AdminTableColumn } from "@/components/admin/AdminTable";
import { AdminStatusBadge, configStatusBadge, propertyStatusBadge } from "@/components/admin/AdminStatusBadge";
import { PropertyFormModal } from "@/components/admin/PropertyFormModal";
import type { AdminProperty } from "@/types/admin";

interface PropertyRow {
  property: AdminProperty;
  ownerNames: string[];
}

export default async function AdminPropertiesPage() {
  const [properties, owners] = await Promise.all([getProperties(), getOwners()]);
  const rows: PropertyRow[] = await Promise.all(
    properties.map(async (property) => ({
      property,
      ownerNames: (await getOwnersForProperty(property.id)).map((owner) => owner.name),
    }))
  );

  const columns: AdminTableColumn<PropertyRow>[] = [
    {
      key: "name",
      header: "Objekt",
      render: (row) => <p className="font-medium text-ink">{row.property.name}</p>,
    },
    { key: "location", header: "Standort", render: (row) => row.property.location },
    {
      key: "owners",
      header: "Eigentümer",
      render: (row) => (row.ownerNames.length > 0 ? row.ownerNames.join(", ") : "—"),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => {
        const badge = propertyStatusBadge(row.property.status);
        return <AdminStatusBadge label={badge.label} tone={badge.tone} />;
      },
    },
    {
      key: "apaleo",
      header: "apaleo",
      render: (row) => {
        const badge = configStatusBadge(Boolean(row.property.apaleoPropertyId));
        return <AdminStatusBadge label={badge.label} tone={badge.tone} />;
      },
    },
    {
      key: "drive",
      header: "Google Drive",
      render: (row) => {
        const badge = configStatusBadge(
          Boolean(row.property.statementsDriveFolderId && row.property.documentsDriveFolderId)
        );
        return <AdminStatusBadge label={badge.label} tone={badge.tone} />;
      },
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (row) => (
        <Link
          href={`/admin/properties/${row.property.id}`}
          className="text-xs font-medium text-ink-soft transition-colors hover:text-ink"
        >
          Ansehen
        </Link>
      ),
    },
  ];

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Objekte</h1>
          <p className="mt-1 text-sm text-ink-soft">{properties.length} Objekte · Stammdaten und Zuordnungen.</p>
        </div>
        <PropertyFormModal
          owners={owners}
          triggerLabel="+ Objekt hinzufügen"
          triggerClassName="rounded-full bg-ink px-4 py-2 text-xs font-medium text-paper transition-opacity hover:opacity-90"
        />
      </div>

      <Card className="p-2 shadow-soft sm:p-3">
        <AdminTable columns={columns} rows={rows} rowKey={(row) => row.property.id} />
      </Card>
    </div>
  );
}
