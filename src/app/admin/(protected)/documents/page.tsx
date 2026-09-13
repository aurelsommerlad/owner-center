import { getOwners } from "@/services/admin/ownerService";
import { getProperties } from "@/services/admin/propertyService";
import { getGeneralDocuments } from "@/services/admin/documentService";
import { Card } from "@/components/ui/Card";
import { PropertySelector } from "@/components/admin/PropertySelector";
import { OwnerSelector } from "@/components/admin/OwnerSelector";
import { DocumentRow } from "@/components/admin/DocumentRow";
import { generalDocumentStatusBadge } from "@/components/admin/AdminStatusBadge";
import { ADMIN_GENERAL_DOCUMENT_CATEGORY_LABEL } from "@/lib/adminLabels";
import { formatShortDate } from "@/lib/format";

export default async function AdminDocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ objekt?: string; eigentuemer?: string }>;
}) {
  const query = await searchParams;
  const [properties, owners] = await Promise.all([getProperties(), getOwners()]);
  const documents = await getGeneralDocuments({ propertyId: query.objekt, ownerId: query.eigentuemer });

  const propertyName = (id: string | null) =>
    id ? (properties.find((property) => property.id === id)?.name ?? id) : "Nicht zugeordnet";
  const ownerName = (id: string | null) => (id ? (owners.find((owner) => owner.id === id)?.name ?? id) : "Nicht zugeordnet");

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Dokumente</h1>
        <p className="mt-1 text-sm text-ink-soft">Allgemeine Unterlagen außerhalb des monatlichen Abrechnungszyklus.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <PropertySelector properties={properties} />
        <OwnerSelector owners={owners} />
      </div>

      <Card className="p-5 shadow-soft sm:p-6">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold text-ink">Dokumente</h2>
          <span className="text-xs text-ink-soft">{documents.length} Dokumente</span>
        </div>

        {documents.length === 0 ? (
          <p className="mt-6 text-sm text-ink-soft">Keine Dokumente für diese Filter.</p>
        ) : (
          <div className="mt-2 divide-y divide-line">
            {documents.map((document) => {
              const badge = generalDocumentStatusBadge(document.status);
              return (
                <DocumentRow
                  key={document.id}
                  title={document.title}
                  subtitle={ADMIN_GENERAL_DOCUMENT_CATEGORY_LABEL[document.category]}
                  meta={[
                    propertyName(document.propertyId),
                    ownerName(document.ownerId),
                    document.fileName,
                    document.publishedAt
                      ? `Veröffentlicht ${formatShortDate(document.publishedAt)}`
                      : "Noch nicht veröffentlicht",
                  ]}
                  status={badge}
                />
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
