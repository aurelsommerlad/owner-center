import { redirect } from "next/navigation";
import { getCurrentOwner } from "@/services/ownerService";
import { getPropertiesForOwner } from "@/services/propertyService";
import { getOwnerLocale } from "@/server/locale";
import { getDictionary, createTranslator } from "@/i18n";

export default async function RootPage() {
  const owner = await getCurrentOwner();
  const properties = await getPropertiesForOwner(owner.id);
  const defaultProperty = properties[0];

  if (!defaultProperty) {
    const t = createTranslator(getDictionary(await getOwnerLocale()));
    return (
      <main className="flex min-h-screen items-center justify-center bg-paper px-6 text-center">
        <p className="text-ink-soft">{t("common.noPropertyForAccount")}</p>
      </main>
    );
  }

  redirect(`/${defaultProperty.id}/uebersicht`);
}
