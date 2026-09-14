import { PlaceholderPage } from "@/components/ui/PlaceholderPage";
import { getOwnerLocale } from "@/server/locale";
import { getDictionary, createTranslator } from "@/i18n";

export default async function HilfePage() {
  const locale = await getOwnerLocale();
  const t = createTranslator(getDictionary(locale));

  return (
    <PlaceholderPage
      title={t("help.title")}
      description={t("help.description")}
      inPreparationLabel={t("common.inPreparation")}
    />
  );
}
