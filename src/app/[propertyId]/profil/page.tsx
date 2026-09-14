import { notFound } from "next/navigation";
import { getProperty } from "@/services/propertyService";
import { requireEffectiveOwnerContext } from "@/server/ownerContext";
import { getSession } from "@/server/session";
import { getOwnerProfile } from "@/services/profileService";
import { Card } from "@/components/ui/Card";
import { PersonalDataCard } from "@/components/profile/PersonalDataCard";
import { PasswordChangeCard } from "@/components/profile/PasswordChangeCard";
import { TeamUsersSection } from "@/components/profile/TeamUsersSection";
import { getOwnerLocale } from "@/server/locale";
import { getDictionary, createTranslator } from "@/i18n";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.08em] text-ink-soft">{label}</p>
      <p className="mt-1 text-sm text-ink">{value}</p>
    </div>
  );
}

/**
 * Owner Center "Profil" - persönliche Daten, Zugang & Sicherheit, Weitere
 * Nutzer. Guarded the same way every other [propertyId] page is: the
 * layout above this already redirects anyone without a valid effective
 * owner context (real Owner login or admin "Als Owner ansehen" preview) -
 * see [propertyId]/layout.tsx. `self` is only present for a real Owner
 * login; during an admin preview it stays `null` and the page shows a note
 * instead of the self-service forms (see getOwnerProfile).
 */
export default async function ProfilPage({ params }: { params: Promise<{ propertyId: string }> }) {
  const { propertyId } = await params;
  const property = await getProperty(propertyId);
  if (!property) notFound();

  const [context, session] = await Promise.all([requireEffectiveOwnerContext(), getSession()]);
  const self =
    !context.isImpersonation && session?.role === "owner" && session.ownerUserId
      ? { userId: session.userId, ownerUserId: session.ownerUserId }
      : null;

  const profile = await getOwnerProfile(context.ownerId, self);
  const locale = await getOwnerLocale();
  const t = createTranslator(getDictionary(locale));

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl italic text-ink sm:text-3xl">{t("profile.title")}</h1>
        <p className="mt-1 text-sm text-ink-soft">{t("profile.subtitle")}</p>
      </div>

      {/* Persönliche Daten */}
      <Card className="p-5 shadow-soft sm:p-6">
        <h2 className="font-display text-lg italic text-ink">{t("profile.personalData")}</h2>
        {profile.self ? (
          <PersonalDataCard
            propertyId={propertyId}
            self={profile.self}
            ownerName={profile.ownerName}
            ownerCompanyName={profile.ownerCompanyName}
          />
        ) : (
          <div className="mt-4">
            <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              <Field label={t("profile.ownerCompany")} value={profile.ownerCompanyName ?? profile.ownerName} />
            </div>
            <p className="mt-4 text-sm text-ink-soft">{t("profile.notAvailableInPreviewPersonal")}</p>
          </div>
        )}
      </Card>

      {/* Zugang & Sicherheit */}
      <Card className="p-5 shadow-soft sm:p-6">
        <h2 className="font-display text-lg italic text-ink">{t("profile.accessSecurity")}</h2>
        {profile.self ? (
          <PasswordChangeCard />
        ) : (
          <p className="mt-3 text-sm text-ink-soft">{t("profile.notAvailableInPreview")}</p>
        )}
      </Card>

      {/* Weitere Nutzer */}
      <Card className="p-5 shadow-soft sm:p-6">
        <TeamUsersSection propertyId={propertyId} team={profile.team} />
      </Card>
    </div>
  );
}
