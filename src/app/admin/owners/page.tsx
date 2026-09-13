import Link from "next/link";
import { getOwners, getPropertiesForOwner } from "@/services/admin/ownerService";
import { getUsersForOwner } from "@/lib/adminPermissions";
import { getProperties } from "@/services/admin/propertyService";
import { Card } from "@/components/ui/Card";
import { AdminTable, type AdminTableColumn } from "@/components/admin/AdminTable";
import { AdminStatusBadge, accountStatusBadge } from "@/components/admin/AdminStatusBadge";
import { AdminOwnerFilters } from "@/components/admin/AdminOwnerFilters";
import { AddOwnerButton } from "@/components/admin/AddOwnerButton";
import { OwnerStatusToggle } from "@/components/admin/OwnerStatusToggle";
import { formatShortDate } from "@/lib/format";
import type { AccountStatus, AdminOwner, AdminOwnerUser } from "@/types/admin";

interface OwnerRow {
  owner: AdminOwner;
  users: AdminOwnerUser[];
  propertyNames: string[];
}

function latestLogin(users: AdminOwnerUser[]): string | undefined {
  return users.reduce<string | undefined>((latest, user) => {
    if (!user.lastLoginAt) return latest;
    if (!latest || user.lastLoginAt > latest) return user.lastLoginAt;
    return latest;
  }, undefined);
}

export default async function AdminOwnersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const query = await searchParams;
  const status = query.status === "active" || query.status === "inactive" ? (query.status as AccountStatus) : undefined;

  const [owners, allProperties] = await Promise.all([getOwners({ search: query.q, status }), getProperties()]);
  const rows: OwnerRow[] = owners.map((owner) => {
    const users = getUsersForOwner(owner.id);
    return { owner, users, propertyNames: [] };
  });
  await Promise.all(
    rows.map(async (row) => {
      row.propertyNames = (await getPropertiesForOwner(row.owner.id)).map((property) => property.name);
    })
  );

  const columns: AdminTableColumn<OwnerRow>[] = [
    {
      key: "name",
      header: "Eigentümer / Gesellschaft",
      render: (row) => (
        <div>
          <p className="font-medium text-ink">{row.owner.name}</p>
          {row.owner.companyName && <p className="text-xs text-ink-soft">{row.owner.companyName}</p>}
        </div>
      ),
    },
    {
      key: "contact",
      header: "Ansprechpartner",
      render: (row) =>
        row.users.length === 1
          ? `${row.users[0].firstName} ${row.users[0].lastName}`
          : `${row.users.length} Nutzer`,
    },
    {
      key: "properties",
      header: "Zugeordnete Objekte",
      render: (row) => (row.propertyNames.length > 0 ? row.propertyNames.join(", ") : "—"),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => {
        const badge = accountStatusBadge(row.owner.status);
        return <AdminStatusBadge label={badge.label} tone={badge.tone} />;
      },
    },
    {
      key: "lastLogin",
      header: "Letzter Login",
      render: (row) => {
        const login = latestLogin(row.users);
        return login ? formatShortDate(login) : "—";
      },
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (row) => (
        <div className="flex items-center justify-end gap-3">
          <Link
            href={`/admin/owners/${row.owner.id}`}
            className="text-xs font-medium text-ink-soft transition-colors hover:text-ink"
          >
            Ansehen
          </Link>
          <OwnerStatusToggle ownerId={row.owner.id} ownerName={row.owner.name} status={row.owner.status} />
        </div>
      ),
    },
  ];

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Eigentümer</h1>
          <p className="mt-1 text-sm text-ink-soft">Eigentümer, Nutzer und Objektzugriffe verwalten.</p>
        </div>
        <AddOwnerButton properties={allProperties} />
      </div>

      <AdminOwnerFilters />

      <Card className="p-2 shadow-soft sm:p-3">
        <AdminTable
          columns={columns}
          rows={rows}
          rowKey={(row) => row.owner.id}
          emptyMessage="Keine Eigentümer für diese Suche/Filter."
        />
      </Card>
    </div>
  );
}
