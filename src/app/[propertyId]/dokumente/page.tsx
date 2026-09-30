import { notFound } from "next/navigation";
import { PlaceholderPage } from "@/components/ui/PlaceholderPage";
import { getProperty } from "@/services/propertyService";
import { getOwnerLocale } from "@/server/locale";
import { getDictionary, createTranslator } from "@/i18n";

/**
 * A placeholder page with no real data of its own yet, so it has no other
 * reason to call getProperty() - but it still must, and with no
 * `allowAccountingRole` flag: [propertyId]/layout.tsx's own property-list
 * gate only checks "does this session have ANY access to this property",
 * not "is this specific page allowed for this role", so a restricted
 * accounting login (which IS granted the property, just not this page)
 * would otherwise render straight through. This call is what actually
 * 404s it here - never rely on the layout gate alone for a page-level
 * restriction (see services/propertyService.ts#getProperty's own doc
 * comment on deny-by-default).
 */
export default async function DokumentePage({ params }: { params: Promise<{ propertyId: string }> }) {
  const { propertyId } = await params;
  const property = await getProperty(propertyId);
  if (!property) notFound();

  const locale = await getOwnerLocale();
  const t = createTranslator(getDictionary(locale));

  return (
    <PlaceholderPage
      title={t("documents.title")}
      description={t("documents.description")}
      inPreparationLabel={t("common.inPreparation")}
    />
  );
}
