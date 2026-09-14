import { Card } from "@/components/ui/Card";
import { ArrowRightIcon } from "@/components/ui/icons";
import { getOwnerLocale } from "@/server/locale";
import { getDictionary, createTranslator } from "@/i18n";
import { CONTACT_INFO, CONTACT_EMAIL_HREF, CONTACT_PHONE_HREF, LEGAL_URLS } from "@/lib/contactInfo";
import { APP_VERSION } from "@/lib/version";

function InfoField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.08em] text-ink-soft">{label}</p>
      <p className="mt-1 text-sm text-ink">{value}</p>
    </div>
  );
}

function LegalLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between py-3 text-sm text-ink transition-colors hover:text-ink-soft"
    >
      {label}
      <ArrowRightIcon className="h-4 w-4 text-ink-soft" />
    </a>
  );
}

export default async function HilfePage() {
  const locale = await getOwnerLocale();
  const t = createTranslator(getDictionary(locale));

  return (
    <div className="flex min-w-0 flex-col gap-8">
      <div>
        <h1 className="font-display text-2xl italic text-ink sm:text-3xl">{t("contact.title")}</h1>
        <p className="mt-1 text-sm text-ink-soft">{t("contact.subtitle")}</p>
      </div>

      {/* Kontaktdaten */}
      <Card className="p-5 shadow-soft sm:p-6">
        <div className="flex items-center gap-3">
          <p className="font-display text-lg italic text-ink">{CONTACT_INFO.companyDisplayName}</p>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
          <InfoField
            label={t("contact.emailLabel")}
            value={
              <a href={CONTACT_EMAIL_HREF} className="transition-colors hover:text-ink-soft">
                {CONTACT_INFO.email}
              </a>
            }
          />
          <InfoField
            label={t("contact.phoneLabel")}
            value={
              <a href={CONTACT_PHONE_HREF} className="transition-colors hover:text-ink-soft">
                {CONTACT_INFO.phoneDisplay}
              </a>
            }
          />
        </div>
      </Card>

      {/* Über das Owner Center */}
      <div className="border-t border-line pt-6">
        <h2 className="text-sm font-semibold text-ink">{t("contact.aboutTitle")}</h2>
        <div className="mt-3">
          <p className="text-sm text-ink">{t("contact.aboutName")}</p>
          <p className="mt-1 text-xs text-ink-soft">{t("contact.version", { version: APP_VERSION })}</p>
        </div>
      </div>

      {/* Rechtliches */}
      <div className="border-t border-line pt-6">
        <h2 className="text-sm font-semibold text-ink">{t("contact.legalTitle")}</h2>
        <div className="mt-1 divide-y divide-line">
          <LegalLink href={LEGAL_URLS.legalNotice} label={t("contact.legalNotice")} />
          <LegalLink href={LEGAL_URLS.privacyPolicy} label={t("contact.privacyPolicy")} />
        </div>
      </div>
    </div>
  );
}
