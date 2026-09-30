import { notFound } from "next/navigation";
import { PlaceholderPage } from "@/components/ui/PlaceholderPage";
import { getProperty } from "@/services/propertyService";
import { getOwnerLocale } from "@/server/locale";
import { getDictionary, createTranslator } from "@/i18n";

/** See dokumente/page.tsx's identical doc comment on why this placeholder page still calls getProperty(). */
export default async function EinheitenPage({ params }: { params: Promise<{ propertyId: string }> }) {
  const { propertyId } = await params;
  const property = await getProperty(propertyId);
  if (!property) notFound();

  const locale = await getOwnerLocale();
  const t = createTranslator(getDictionary(locale));

  return (
    <PlaceholderPage
      title={t("units.title")}
      description={t("units.description")}
      inPreparationLabel={t("common.inPreparation")}
    />
  );
}
