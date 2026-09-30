import { notFound } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { ImpersonationBanner } from "@/components/layout/ImpersonationBanner";
import { LocaleProvider } from "@/components/i18n/LocaleProvider";
import { getCurrentOwner } from "@/services/ownerService";
import { getPropertiesForEffectiveContext, getPropertiesForOwner } from "@/services/propertyService";
import { getEffectiveOwnerContext } from "@/server/ownerContext";
import { getOwnerLocale } from "@/server/locale";
import { getSignedInOwnerIdentity } from "@/server/ownerIdentity";
import { getDictionary } from "@/i18n";

export default async function PropertyLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ propertyId: string }>;
}) {
  const { propertyId } = await params;
  const [owner, context, locale, identity] = await Promise.all([
    getCurrentOwner(),
    getEffectiveOwnerContext(),
    getOwnerLocale(),
    getSignedInOwnerIdentity(),
  ]);
  // A restricted "accounting" login only ever gets its own granted subset
  // here (see getPropertiesForEffectiveContext) - never the owner company's
  // full property list, so neither the property switcher nor this layout's
  // own gate below can ever offer a property outside that grant. Falls back
  // to the unrestricted list only if context somehow failed to resolve
  // (getCurrentOwner() above would already have redirected in that case).
  const properties = context ? await getPropertiesForEffectiveContext(context) : await getPropertiesForOwner(owner.id);
  const property = properties.find((item) => item.id === propertyId);

  if (!property) {
    notFound();
  }

  const dict = getDictionary(locale);
  const accountingOnly = context?.ownerUserRole === "accounting";

  return (
    <LocaleProvider locale={locale} dict={dict}>
      <div className="flex min-h-screen bg-paper">
        <Sidebar propertyId={propertyId} identity={identity} accountingOnly={accountingOnly} />
        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <TopBar properties={properties} currentPropertyId={propertyId} accountingOnly={accountingOnly} />
          <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-9">
            {context?.isImpersonation && (
              <div className="mb-6">
                <ImpersonationBanner ownerName={owner.name} />
              </div>
            )}
            {children}
          </main>
        </div>
      </div>
    </LocaleProvider>
  );
}
