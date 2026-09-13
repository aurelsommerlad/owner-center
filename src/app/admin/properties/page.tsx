import Link from "next/link";
import { getOwnersForProperty, getProperties } from "@/services/admin/propertyService";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminTable, type AdminTableColumn } from "@/components/admin/AdminTable";
import { AdminStatusBadge, propertyStatusBadge } from "@/components/admin/AdminStatusBadge";
import type { AdminProperty } from "@/types/admin";

interface PropertyRow {
  property: AdminProperty;
  ownerNames: string[];
}

function DriveFolderCell({ folderId }: { folderId: string | null }) {
  return folderId ? (
    <span className="text-[#171817]">{folderId}</span>
  ) : (
    <span className="text-[#74736E]">Nicht eingerichtet</span>
  );
}

export default async function AdminPropertiesPage() {
  const properties = await getProperties();
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
      render: (row) => (
        <div>
          <p className="font-medium text-[#171817]">{row.property.name}</p>
          <p className="text-xs text-[#74736E]">{row.property.location}</p>
        </div>
      ),
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
      key: "owners",
      header: "Eigentümer",
      render: (row) => (row.ownerNames.length > 0 ? row.ownerNames.join(", ") : "—"),
    },
    {
      key: "apaleo",
      header: "apaleo Property-ID",
      render: (row) => row.property.apaleoPropertyId ?? <span className="text-[#74736E]">Nicht verknüpft</span>,
    },
    {
      key: "statementsFolder",
      header: "Drive · Abrechnungen",
      render: (row) => <DriveFolderCell folderId={row.property.statementsDriveFolderId} />,
    },
    {
      key: "documentsFolder",
      header: "Drive · Dokumente",
      render: (row) => <DriveFolderCell folderId={row.property.documentsDriveFolderId} />,
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (row) => (
        <Link href={`/admin/properties/${row.property.id}`} className="text-xs font-medium text-[#52664E] hover:underline">
          Ansehen
        </Link>
      ),
    },
  ];

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#171817]">Objekte</h1>
        <p className="mt-1 text-sm text-[#74736E]">{properties.length} Objekte · Stammdaten und Zuordnungen.</p>
      </div>

      <AdminCard className="p-2 sm:p-3">
        <AdminTable columns={columns} rows={rows} rowKey={(row) => row.property.id} />
      </AdminCard>
    </div>
  );
}
