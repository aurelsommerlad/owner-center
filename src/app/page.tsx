import { redirect } from "next/navigation";
import { getCurrentOwner } from "@/services/ownerService";
import { getPropertiesForEffectiveContext } from "@/services/propertyService";
import { getEffectiveOwnerContext } from "@/server/ownerContext";
import { getOwnerLocale } from "@/server/locale";
import { getDictionary, createTranslator } from "@/i18n";

export default async function RootPage() {
  // getCurrentOwner() itself redirects to /login for any invalid/missing
  // session - the same auth gate this page has always used - its resolved
  // Owner isn't otherwise needed once getEffectiveOwnerContext() is also
  // available below.
  const [, context] = await Promise.all([getCurrentOwner(), getEffectiveOwnerContext()]);
  const properties = context ? await getPropertiesForEffectiveContext(context) : [];
  const defaultProperty = properties[0];

  if (!defaultProperty) {
    const t = createTranslator(getDictionary(await getOwnerLocale()));
    return (
      <main className="flex min-h-screen items-center justify-center bg-paper px-6 text-center">
        <p className="text-ink-soft">{t("common.noPropertyForAccount")}</p>
      </main>
    );
  }

  // A restricted "accounting" login has no business landing on the full
  // Übersicht dashboard - it never has access to it (see
  // services/propertyService.ts#getProperty's default deny for that role) -
  // so it goes straight to the one area it's actually for.
  const segment = context?.ownerUserRole === "accounting" ? "abrechnungen" : "uebersicht";
  redirect(`/${defaultProperty.id}/${segment}`);
}
