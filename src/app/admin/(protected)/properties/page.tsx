import Link from "next/link";
import { getOwners } from "@/services/admin/ownerService";
import { getOwnersForProperty, getProperties } from "@/services/admin/propertyService";
import { Card } from "@/components/ui/Card";
import { AdminTable, type AdminTableColumn } from "@/components/admin/AdminTable";
import { AdminStatusBadge, apaleoMappingStatusBadge, googleDriveMappingStatusBadge, propertyStatusBadge } from "@/components/admin/AdminStatusBadge";
import { PropertyFormModal } from "@/components/admin/PropertyFormModal";
import { ApaleoPropertyActionCell } from "@/components/admin/ApaleoPropertyActionCell";
import { loadApaleoMappingOverview, mappingStatusFor } from "@/server/integrations/apaleo/mappingStatus";
import { loadGoogleDriveFolderMappingOverview, driveMappingStatusFor } from "@/server/integrations/googleDrive/folderMapping";
import type { AdminProperty } from "@/types/admin";
import type { ApaleoPropertySummary } from "@/server/integrations/apaleo/types";

interface PropertyRow {
  property: AdminProperty;
  ownerNames: string[];
}

export default async function AdminPropertiesPage() {
  // "+ Objekt hinzufügen" is create-only (no existing assignment could ever
  // be silently dropped), so it's safe - and correct, per "Owner
  // verschwindet aus normalen aktiven Auswahlfeldern" - to only offer active
  // owners here.
  const [properties, owners, apaleoOverview, driveOverview] = await Promise.all([
    getProperties(),
    getOwners({ status: "active" }),
    loadApaleoMappingOverview(),
    loadGoogleDriveFolderMappingOverview(),
  ]);
  const rows: PropertyRow[] = await Promise.all(
    properties.map(async (property) => ({
      property,
      ownerNames: (await getOwnersForProperty(property.id)).map((owner) => owner.name),
    }))
  );

  // Reverse lookup for the apaleo-side table below: which internal property
  // (if any) currently claims each live apaleo property.
  const internalByApaleoId = new Map(
    properties.filter((property) => property.apaleoPropertyId).map((property) => [property.apaleoPropertyId!, property])
  );
  const unmappedProperties = properties
    .filter((property) => !property.apaleoPropertyId)
    .map((property) => ({ id: property.id, name: property.name, location: property.location }));

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
        const badge = apaleoMappingStatusBadge(mappingStatusFor(row.property.apaleoPropertyId, apaleoOverview));
        return <AdminStatusBadge label={badge.label} tone={badge.tone} />;
      },
    },
    {
      key: "drive",
      header: "Google Drive",
      render: (row) => {
        const badge = googleDriveMappingStatusBadge(driveMappingStatusFor(row.property.googleDriveFolderId, driveOverview));
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

  const apaleoColumns: AdminTableColumn<ApaleoPropertySummary>[] = [
    { key: "id", header: "apaleo Property-ID", render: (row) => <p className="font-medium text-ink">{row.id}</p> },
    { key: "name", header: "Name", render: (row) => row.name },
    {
      key: "mapping",
      header: "Mapping-Status",
      render: (row) => {
        const internal = internalByApaleoId.get(row.id);
        if (!internal) return <span className="text-ink-soft">Noch nicht zugeordnet</span>;
        return (
          <Link href={`/admin/properties/${internal.id}`} className="text-ink transition-colors hover:text-ink-soft">
            Zugeordnet · {internal.name}
          </Link>
        );
      },
    },
    {
      key: "action",
      header: "Aktion",
      render: (row) => (
        <ApaleoPropertyActionCell
          apaleoId={row.id}
          apaleoName={row.name}
          linkedPropertyId={internalByApaleoId.get(row.id)?.id ?? null}
          unmappedProperties={unmappedProperties}
        />
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

      <div>
        <h2 className="text-sm font-semibold text-ink">apaleo Objekte</h2>
        <p className="mt-1 text-xs text-ink-soft">
          {apaleoOverview.available
            ? `${apaleoOverview.apaleoProperties.length} Objekte live aus apaleo gelesen.`
            : `apaleo-Daten aktuell nicht verfügbar${apaleoOverview.errorMessage ? ` – ${apaleoOverview.errorMessage}` : ""}.`}
        </p>
      </div>
      {apaleoOverview.available && (
        <Card className="p-2 shadow-soft sm:p-3">
          <AdminTable
            columns={apaleoColumns}
            rows={apaleoOverview.apaleoProperties}
            rowKey={(row) => row.id}
            emptyMessage="Keine apaleo Objekte gefunden."
          />
        </Card>
      )}
    </div>
  );
}
