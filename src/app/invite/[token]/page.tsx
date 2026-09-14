import { Card } from "@/components/ui/Card";
import { lookupInvitationByToken } from "@/server/invitations";
import { InviteAcceptForm } from "./InviteAcceptForm";
import { getPublicLocale } from "@/server/locale";
import { getDictionary, createTranslator } from "@/i18n";

/**
 * Public route - no session/auth guard, reachable by anyone with the link.
 * The token itself is the only credential: lookupInvitationByToken()
 * decides what's shown, and never reveals whether a *different* token
 * would have matched a real user (see its own doc comment).
 */
export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const lookup = await lookupInvitationByToken(token);
  const locale = await getPublicLocale();
  const dict = getDictionary(locale);
  const t = createTranslator(dict);

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="font-sans text-sm font-semibold tracking-[0.05em] text-ink">{t("nav.brand")}</p>
          <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-ink-soft">
            {t("nav.brandSubtitleDesktop")}
          </p>
        </div>

        <Card className="p-6 shadow-soft-lg sm:p-8">
          {lookup.status === "valid" ? (
            <>
              <h1 className="font-display text-xl italic text-ink">{t("invite.welcomeTitle")}</h1>
              <p className="mt-1 text-sm text-ink-soft">
                {t("invite.forAccount")} <span className="text-ink">{lookup.email}</span>
              </p>
              <div className="mt-6">
                <InviteAcceptForm token={token} locale={locale} dict={dict} />
              </div>
            </>
          ) : (
            <>
              <h1 className="font-display text-xl italic text-ink">{t("invite.unavailableTitle")}</h1>
              <p className="mt-3 text-sm text-ink-soft">
                {lookup.status === "expired" || lookup.status === "revoked"
                  ? t("invite.expiredOrRevoked")
                  : lookup.status === "accepted"
                    ? t("invite.alreadyAccepted")
                    : t("invite.invalidLink")}
              </p>
            </>
          )}
        </Card>
      </div>
    </main>
  );
}
