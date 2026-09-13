import Link from "next/link";
import { getOwners, getPropertiesForOwner } from "@/services/admin/ownerService";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminTable, type AdminTableColumn } from "@/components/admin/AdminTable";
import { AdminStatusBadge, accountStatusBadge } from "@/components/admin/AdminStatusBadge";
import { formatShortDate } from "@/lib/format";
import type { AdminOwner } from "@/types/admin";

interface OwnerRow {
  owner: AdminOwner;
  propertyNames: string[];
}

export default async function AdminOwnersPage() {
  const owners = await getOwners();
  const rows: OwnerRow[] = await Promise.all(
    owners.map(async (owner) => ({
      owner,
      propertyNames: (await getPropertiesForOwner(owner.id)).map((property) => property.name),
    }))
  );

  const columns: AdminTableColumn<OwnerRow>[] = [
    {
      key: "name",
      header: "Name",
      render: (row) => (
        <div>
          <p className="font-medium text-[#171817]">{row.owner.name}</p>
          <p className="text-xs text-[#74736E]">{row.owner.email}</p>
        </div>
      ),
    },
    { key: "company", header: "Unternehmen", render: (row) => row.owner.company },
    {
      key: "status",
      header: "Status",
      render: (row) => {
        const badge = accountStatusBadge(row.owner.status);
        return <AdminStatusBadge label={badge.label} tone={badge.tone} />;
      },
    },
    {
      key: "properties",
      header: "Zugeordnete Objekte",
      render: (row) => (row.propertyNames.length > 0 ? row.propertyNames.join(", ") : "—"),
    },
    {
      key: "lastLogin",
      header: "Letzter Login",
      render: (row) => (row.owner.lastLoginAt ? formatShortDate(row.owner.lastLoginAt) : "—"),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (row) => (
        <div className="flex items-center justify-end gap-3">
          <Link href={`/admin/owners/${row.owner.id}`} className="text-xs font-medium text-[#52664E] hover:underline">
            Ansehen
          </Link>
          <button type="button" className="text-xs font-medium text-[#74736E] hover:text-[#171817]">
            Bearbeiten
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#171817]">Eigentümer</h1>
        <p className="mt-1 text-sm text-[#74736E]">
          {owners.length} Eigentümer · Zugänge und Objektzuordnung verwalten.
        </p>
      </div>

      <AdminCard className="p-2 sm:p-3">
        <AdminTable columns={columns} rows={rows} rowKey={(row) => row.owner.id} />
      </AdminCard>
    </div>
  );
}
