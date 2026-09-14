import { getAdminAccounts } from "@/services/admin/adminUserService";
import { getAdminSession } from "@/lib/adminAuth";
import { Card } from "@/components/ui/Card";
import { AdminTable, type AdminTableColumn } from "@/components/admin/AdminTable";
import { AdminStatusBadge, adminAccountStatusBadge } from "@/components/admin/AdminStatusBadge";
import { AdminAccountFormModal } from "@/components/admin/AdminAccountFormModal";
import { RecreateAdminInvitationButton } from "@/components/admin/RecreateAdminInvitationButton";
import { AdminAccountStatusToggle } from "@/components/admin/AdminAccountStatusToggle";
import { DeleteAdminAccountButton } from "@/components/admin/DeleteAdminAccountButton";
import { formatShortDate } from "@/lib/format";
import type { AdminAccount } from "@/types/admin";

/**
 * Flat list - deliberately no detail sub-route (unlike /admin/owners/[id]):
 * an admin account has nothing to drill into beyond what's already shown
 * here (no properties/documents/access to configure).
 */
export default async function AdminAccountsPage() {
  const [accounts, session] = await Promise.all([getAdminAccounts(), getAdminSession()]);

  const columns: AdminTableColumn<AdminAccount>[] = [
    {
      key: "name",
      header: "Name",
      render: (account) => (
        <p className="font-medium text-ink">
          {account.name}
          {session?.userId === account.id && <span className="ml-2 text-xs font-normal text-ink-soft">(Sie)</span>}
        </p>
      ),
    },
    { key: "email", header: "E-Mail", render: (account) => account.email },
    {
      key: "status",
      header: "Status",
      render: (account) => {
        const badge = adminAccountStatusBadge(account.status, account.invitationExpiresAt);
        return <AdminStatusBadge label={badge.label} tone={badge.tone} />;
      },
    },
    {
      key: "lastLogin",
      header: "Letzter Login",
      render: (account) => (account.lastLoginAt ? formatShortDate(account.lastLoginAt) : "—"),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (account) => (
        <div className="flex items-center justify-end gap-3">
          {account.status !== "active" && (
            <RecreateAdminInvitationButton userId={account.id} userName={account.name} userEmail={account.email} />
          )}
          <AdminAccountStatusToggle userId={account.id} userName={account.name} status={account.status} />
          <DeleteAdminAccountButton userId={account.id} userName={account.name} />
        </div>
      ),
    },
  ];

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Admins</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Weitere Administratoren einladen und verwalten. Neue Admins erhalten einen Einladungslink, um selbst ein
            Passwort festzulegen - noch kein automatischer E-Mail-Versand.
          </p>
        </div>
        <AdminAccountFormModal
          triggerLabel="+ Admin einladen"
          triggerClassName="rounded-full bg-ink px-4 py-2 text-xs font-medium text-paper transition-opacity hover:opacity-90"
        />
      </div>

      <Card className="p-2 shadow-soft sm:p-3">
        <AdminTable columns={columns} rows={accounts} rowKey={(account) => account.id} emptyMessage="Noch keine Admins angelegt." />
      </Card>
    </div>
  );
}
