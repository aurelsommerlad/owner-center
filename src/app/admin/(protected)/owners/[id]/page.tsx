import Link from "next/link";
import { notFound } from "next/navigation";
import { getOwner, getOwnerDependencySummary, getPropertiesForOwner } from "@/services/admin/ownerService";
import { getOwnerUsers } from "@/services/admin/ownerUserService";
import { getProperties } from "@/services/admin/propertyService";
import { Card } from "@/components/ui/Card";
import {
  AdminStatusBadge,
  accountStatusBadge,
  apaleoMappingStatusBadge,
  ownerUserStatusBadge,
} from "@/components/admin/AdminStatusBadge";
import { OwnerStatusToggle } from "@/components/admin/OwnerStatusToggle";
import { EditOwnerButton } from "@/components/admin/EditOwnerButton";
import { DeleteOwnerButton } from "@/components/admin/DeleteOwnerButton";
import { ViewAsOwnerButton } from "@/components/admin/ViewAsOwnerButton";
import { OwnerUserFormModal } from "@/components/admin/OwnerUserFormModal";
import { OwnerUserStatusToggle } from "@/components/admin/OwnerUserStatusToggle";
import { RecreateInvitationButton } from "@/components/admin/RecreateInvitationButton";
import { DeleteOwnerUserButton } from "@/components/admin/DeleteOwnerUserButton";
import { EditAccessButton } from "@/components/admin/EditAccessButton";
import { loadApaleoMappingOverview, mappingStatusFor } from "@/server/integrations/apaleo/mappingStatus";
import { formatShortDate } from "@/lib/format";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.08em] text-ink-soft">{label}</p>
      <p className="mt-1 text-sm text-ink">{value}</p>
    </div>
  );
}

export default async function AdminOwnerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const owner = await getOwner(id);
  if (!owner) notFound();

  const [users, properties, allProperties, apaleoOverview, dependencySummary] = await Promise.all([
    getOwnerUsers(owner.id),
    getPropertiesForOwner(owner.id),
    getProperties(),
    loadApaleoMappingOverview(),
    getOwnerDependencySummary(owner.id),
  ]);
  const statusBadge = accountStatusBadge(owner.status);

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div>
        <Link href="/admin/owners" className="text-xs font-medium text-ink-soft transition-colors hover:text-ink">
          ← Eigentümer
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-ink">{owner.name}</h1>
            {owner.companyName && <p className="mt-1 text-sm text-ink-soft">{owner.companyName}</p>}
          </div>
          <div className="flex items-center gap-2">
            <ViewAsOwnerButton
              ownerId={owner.id}
              className="rounded-full border border-line px-4 py-2 text-xs font-medium text-ink-soft transition-colors hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
        </div>
      </div>

      {/* Eigentümerdaten */}
      <Card className="p-5 shadow-soft sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold text-ink">Eigentümerdaten</h2>
          <EditOwnerButton owner={owner} />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-5 lg:grid-cols-4">
          <Field label="Name" value={owner.name} />
          <Field label="Unternehmen" value={owner.companyName ?? "—"} />
          <Field label="Status" value={<AdminStatusBadge label={statusBadge.label} tone={statusBadge.tone} />} />
          <Field label="Erstellt am" value={formatShortDate(owner.createdAt)} />
        </div>
      </Card>

      {/* Zugeordnete Benutzer */}
      <Card className="p-5 shadow-soft sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-ink">Zugeordnete Benutzer</h2>
            <p className="mt-1 text-xs text-ink-soft">
              Ein Eigentümer kann mehrere Nutzer/Logins haben. Neue Nutzer erhalten einen Einladungslink, um selbst
              ein Passwort festzulegen - noch kein automatischer E-Mail-Versand.
            </p>
          </div>
          <OwnerUserFormModal
            ownerId={owner.id}
            triggerLabel="+ Nutzer hinzufügen"
            triggerClassName="rounded-full bg-ink px-4 py-2 text-xs font-medium text-paper transition-opacity hover:opacity-90"
          />
        </div>
        <div className="mt-3 divide-y divide-line">
          {users.length === 0 && <p className="py-3 text-sm text-ink-soft">Noch keine Nutzer angelegt.</p>}
          {users.map((user) => {
            const userStatus = ownerUserStatusBadge(user.status, user.invitationExpiresAt);
            return (
              <div key={user.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <div>
                  <p className="font-medium text-ink">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-xs text-ink-soft">{user.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-ink-soft">
                    {user.lastLoginAt ? formatShortDate(user.lastLoginAt) : "—"}
                  </span>
                  <AdminStatusBadge label={userStatus.label} tone={userStatus.tone} />
                  <OwnerUserFormModal
                    ownerId={owner.id}
                    user={user}
                    triggerLabel="Bearbeiten"
                    triggerClassName="text-xs font-medium text-ink-soft transition-colors hover:text-ink"
                  />
                  {user.status !== "active" && (
                    <RecreateInvitationButton
                      ownerUserId={user.id}
                      ownerId={owner.id}
                      userName={`${user.firstName} ${user.lastName}`}
                      userEmail={user.email}
                    />
                  )}
                  <OwnerUserStatusToggle
                    userId={user.id}
                    ownerId={owner.id}
                    userName={`${user.firstName} ${user.lastName}`}
                    status={user.status}
                  />
                  <DeleteOwnerUserButton
                    ownerUserId={user.id}
                    ownerId={owner.id}
                    userName={`${user.firstName} ${user.lastName}`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Zugeordnete Objekte */}
      <Card className="p-5 shadow-soft sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold text-ink">Zugeordnete Objekte</h2>
          <EditAccessButton
            ownerId={owner.id}
            ownerName={owner.name}
            allProperties={allProperties}
            activePropertyIds={properties.map((property) => property.id)}
          />
        </div>
        <div className="mt-3 divide-y divide-line">
          {properties.length === 0 && <p className="py-3 text-sm text-ink-soft">Noch kein Objektzugriff.</p>}
          {properties.map((property) => {
            const apaleoBadge = apaleoMappingStatusBadge(mappingStatusFor(property.apaleoPropertyId, apaleoOverview));
            return (
              <div key={property.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <Link href={`/admin/properties/${property.id}`} className="text-ink transition-colors hover:text-ink-soft">
                  {property.name} · {property.location}
                </Link>
                <div className="flex items-center gap-2">
                  <AdminStatusBadge label={apaleoBadge.label} tone={apaleoBadge.tone} />
                  <AdminStatusBadge label="Zugriff aktiv" tone="positive" />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Dokumente */}
      <Card className="p-5 shadow-soft sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold text-ink">Dokumente</h2>
          <Link
            href={`/admin/documents?eigentuemer=${owner.id}`}
            className="text-xs font-medium text-ink-soft transition-colors hover:text-ink"
          >
            Alle Dokumente ansehen
          </Link>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-2">
          <Field label="Abrechnungsdokumente" value={dependencySummary.statementDocumentCount} />
          <Field label="Sonstige Dokumente" value={dependencySummary.generalDocumentCount} />
        </div>
      </Card>

      {/* Gefahrenbereich */}
      <Card className="border-status-blocked/40 p-5 shadow-soft sm:p-6">
        <h2 className="text-sm font-semibold text-ink">Gefahrenbereich</h2>
        <p className="mt-1 text-xs text-ink-soft">
          Diese Aktionen betreffen den Zugang und den Datensatz dieses Eigentümers und sollten mit Bedacht ausgeführt
          werden.
        </p>
        <div className="mt-4 flex flex-col gap-4 border-t border-line pt-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-ink">
                {owner.status === "active" ? "Eigentümer deaktivieren" : "Eigentümer reaktivieren"}
              </p>
              <p className="mt-1 text-xs text-ink-soft">
                {owner.status === "active"
                  ? "Sperrt den Zugang zum Owner Center. Bestehende Daten und Zuordnungen bleiben erhalten."
                  : "Gibt dem Eigentümer wieder Zugriff auf das Owner Center."}
              </p>
            </div>
            <OwnerStatusToggle
              ownerId={owner.id}
              ownerName={owner.name}
              status={owner.status}
              className="rounded-full border border-line px-4 py-2 text-xs font-medium text-ink-soft transition-colors hover:border-ink hover:text-ink"
            />
          </div>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-ink">Eigentümer endgültig löschen</p>
              <p className="mt-1 text-xs text-ink-soft">
                Entfernt den Eigentümer-Datensatz unwiderruflich. Nur möglich, wenn keine Benutzer, Objektzuordnungen
                oder Dokumente mehr zugeordnet sind.
              </p>
            </div>
            <DeleteOwnerButton ownerId={owner.id} ownerName={owner.name} dependencySummary={dependencySummary} />
          </div>
        </div>
      </Card>
    </div>
  );
}
