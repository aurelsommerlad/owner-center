import Link from "next/link";
import { notFound } from "next/navigation";
import { getOwners } from "@/services/admin/ownerService";
import { getOwnersForProperty, getProperties, getProperty } from "@/services/admin/propertyService";
import { Card } from "@/components/ui/Card";
import { AdminStatusBadge, propertyStatusBadge } from "@/components/admin/AdminStatusBadge";
import { PropertyFormModal } from "@/components/admin/PropertyFormModal";
import { ApaleoPropertyMappingCard } from "@/components/admin/ApaleoPropertyMappingCard";
import { GoogleDriveFolderMappingCard } from "@/components/admin/GoogleDriveFolderMappingCard";
import { PropertyOwnersEditor } from "@/components/admin/PropertyOwnersEditor";
import { loadApaleoMappingOverview, mappingStatusFor } from "@/server/integrations/apaleo/mappingStatus";
import { getUnitsForProperty } from "@/server/integrations/apaleo/unitService";
import { describeApaleoError } from "@/server/integrations/apaleo/errors";
import { loadGoogleDriveFolderMappingOverview, driveMappingStatusFor } from "@/server/integrations/googleDrive/folderMapping";
import { formatShortDate } from "@/lib/format";
import type { ApaleoUnitSummary } from "@/server/integrations/apaleo/types";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.08em] text-ink-soft">{label}</p>
      <p className="mt-1 text-sm text-ink">{value}</p>
    </div>
  );
}

export default async function AdminPropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const property = await getProperty(id);
  if (!property) notFound();

  const [owners, allOwners, allProperties, apaleoOverview, driveOverview] = await Promise.all([
    getOwnersForProperty(property.id),
    getOwners(),
    getProperties(),
    loadApaleoMappingOverview(),
    loadGoogleDriveFolderMappingOverview(),
  ]);
  const statusBadge = propertyStatusBadge(property.status);

  // Which apaleo properties are still free to pick: not already claimed by
  // a DIFFERENT internal property (this property's own current id, if any,
  // stays selectable - that's not a conflict, it's the current mapping).
  const takenByOthers = new Set(
    allProperties
      .filter((other) => other.id !== property.id && other.apaleoPropertyId)
      .map((other) => other.apaleoPropertyId!)
  );
  const apaleoOptions = apaleoOverview.apaleoProperties.filter((option) => !takenByOthers.has(option.id));
  const mappingStatus = mappingStatusFor(property.apaleoPropertyId, apaleoOverview);
  const currentApaleoPropertyName = property.apaleoPropertyId
    ? apaleoOverview.byId.get(property.apaleoPropertyId)?.name
    : undefined;

  // Same "not claimed by a DIFFERENT internal property" filter as apaleo
  // above, enforced again server-side in setGoogleDriveFolderMappingAction -
  // this is only what keeps the dropdown itself free of options that would
  // just be rejected on save.
  const takenByOthersDrive = new Set(
    allProperties
      .filter((other) => other.id !== property.id && other.googleDriveFolderId)
      .map((other) => other.googleDriveFolderId!)
  );
  const driveFolderOptions = driveOverview.folders.filter((option) => !takenByOthersDrive.has(option.id));
  const driveMappingStatus = driveMappingStatusFor(property.googleDriveFolderId, driveOverview);
  const currentDriveFolderName = property.googleDriveFolderId
    ? driveOverview.byId.get(property.googleDriveFolderId)?.name
    : undefined;

  let unitsPreview: ApaleoUnitSummary[] | null = null;
  let unitsPreviewError: string | null = null;
  if (property.apaleoPropertyId) {
    if (!apaleoOverview.available) {
      unitsPreviewError = `apaleo-Daten aktuell nicht verfügbar${apaleoOverview.errorMessage ? ` – ${apaleoOverview.errorMessage}` : ""}.`;
    } else {
      try {
        const units = await getUnitsForProperty(property.apaleoPropertyId);
        unitsPreview = units.filter((unit) => unit.isActive);
      } catch (err) {
        unitsPreviewError = describeApaleoError(err);
      }
    }
  }

  // Inactive owners never re-enter selection here: "available" is for
  // adding a NEW assignment, and an inactive owner disappearing from normal
  // active selection fields is the whole point of deactivating them. The
  // edit-mode PropertyFormModal below is different - it must still include
  // any owner already assigned (even inactive), or resubmitting the form's
  // wholesale-replace access update would silently drop their access.
  const availableOwners = allOwners.filter(
    (owner) => owner.status === "active" && !owners.some((current) => current.id === owner.id)
  );
  const ownersForFormModal = allOwners.filter(
    (owner) => owner.status === "active" || owners.some((current) => current.id === owner.id)
  );

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
            owners={ownersForFormModal}
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
        <PropertyOwnersEditor propertyId={property.id} currentOwners={owners} availableOwners={availableOwners} />
      </Card>

      {/* apaleo */}
      <ApaleoPropertyMappingCard
        propertyId={property.id}
        propertyName={property.name}
        propertyLocation={property.location}
        currentApaleoPropertyId={property.apaleoPropertyId}
        currentApaleoPropertyName={currentApaleoPropertyName}
        mappingStatus={mappingStatus}
        apaleoOptions={apaleoOptions}
        apaleoAvailable={apaleoOverview.available}
        apaleoErrorMessage={apaleoOverview.errorMessage}
        unitsPreview={unitsPreview}
        unitsPreviewError={unitsPreviewError}
      />

      {/* Google Drive */}
      <GoogleDriveFolderMappingCard
        propertyId={property.id}
        currentFolderId={property.googleDriveFolderId}
        currentFolderName={currentDriveFolderName}
        mappingStatus={driveMappingStatus}
        folderOptions={driveFolderOptions}
        driveAvailable={driveOverview.available}
        driveErrorMessage={driveOverview.errorMessage}
      />
    </div>
  );
}
