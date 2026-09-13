import Link from "next/link";
import { notFound } from "next/navigation";
import { getOwner, getOwnerUsers, getPropertiesForOwner } from "@/services/admin/ownerService";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminStatusBadge, accountStatusBadge } from "@/components/admin/AdminStatusBadge";
import { USER_ROLE_LABEL } from "@/lib/adminLabels";
import { formatShortDate } from "@/lib/format";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-[#74736E]">{label}</p>
      <p className="mt-1 text-sm text-[#171817]">{value}</p>
    </div>
  );
}

export default async function AdminOwnerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const owner = await getOwner(id);
  if (!owner) notFound();

  const [users, properties] = await Promise.all([getOwnerUsers(owner.id), getPropertiesForOwner(owner.id)]);
  const statusBadge = accountStatusBadge(owner.status);

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div>
        <Link href="/admin/owners" className="text-xs font-medium text-[#74736E] hover:text-[#171817]">
          ← Eigentümer
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-[#171817]">{owner.name}</h1>
        <p className="mt-1 text-sm text-[#74736E]">{owner.company}</p>
      </div>

      <AdminCard className="grid grid-cols-2 gap-x-6 gap-y-5 p-5 sm:p-6 lg:grid-cols-4">
        <Field label="Name" value={owner.name} />
        <Field label="Unternehmen" value={owner.company} />
        <Field label="E-Mail" value={owner.email} />
        <Field label="Status" value={<AdminStatusBadge label={statusBadge.label} tone={statusBadge.tone} />} />
        <Field label="Rolle" value={USER_ROLE_LABEL[owner.role]} />
        <Field
          label="Zugeordnete Objekte"
          value={
            properties.length > 0 ? (
              <span className="flex flex-wrap gap-x-1.5">
                {properties.map((property, index) => (
                  <span key={property.id}>
                    <Link href={`/admin/properties/${property.id}`} className="hover:underline">
                      {property.name}
                    </Link>
                    {index < properties.length - 1 && ","}
                  </span>
                ))}
              </span>
            ) : (
              "—"
            )
          }
        />
        <Field label="Letzter Login" value={owner.lastLoginAt ? formatShortDate(owner.lastLoginAt) : "—"} />
        <Field label="Erstellungsdatum" value={formatShortDate(owner.createdAt)} />
      </AdminCard>

      <AdminCard className="p-5 sm:p-6">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold text-[#171817]">Nutzer</h2>
          <span className="text-xs text-[#74736E]">{users.length} Nutzer</span>
        </div>
        <p className="mt-1 text-xs text-[#74736E]">
          Ein Eigentümer kann mehrere Nutzer/Logins haben - vorbereitet für spätere Einladungen.
        </p>
        <div className="mt-3 divide-y divide-[#E4E0D8]/70">
          {users.map((user) => {
            const userStatus = accountStatusBadge(user.status);
            return (
              <div key={user.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <div>
                  <p className="font-medium text-[#171817]">{user.name}</p>
                  <p className="text-xs text-[#74736E]">{user.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-[#74736E]">{USER_ROLE_LABEL[user.role]}</span>
                  <AdminStatusBadge label={userStatus.label} tone={userStatus.tone} />
                  <span className="text-xs text-[#74736E]">
                    {user.lastLoginAt ? formatShortDate(user.lastLoginAt) : "—"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </AdminCard>
    </div>
  );
}
