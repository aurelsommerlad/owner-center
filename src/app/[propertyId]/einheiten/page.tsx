import { PlaceholderPage } from "@/components/ui/PlaceholderPage";
import { getOwnerLocale } from "@/server/locale";
import { getDictionary, createTranslator } from "@/i18n";

export default async function EinheitenPage() {
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
