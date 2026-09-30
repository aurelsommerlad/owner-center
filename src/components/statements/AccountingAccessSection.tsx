"use client";

import { useState } from "react";
import { inviteAccountingAccessAction } from "@/app/[propertyId]/abrechnungen/actions";
import { AccountingAccessRow } from "./AccountingAccessRow";
import { PropertyScopePicker } from "./PropertyScopePicker";
import { InviteLinkDisplay } from "@/components/profile/InviteLinkDisplay";
import { PROFILE_INPUT_CLASS, PROFILE_LABEL_CLASS } from "@/components/profile/formStyles";
import type { AccountingAccessGrant, Property } from "@/types";
import { useTranslations } from "@/components/i18n/LocaleProvider";

/**
 * "Zugang für Buchhaltung" - owner-only (never rendered for a restricted
 * accounting login itself, see app/[propertyId]/abrechnungen/page.tsx).
 * Deliberately visually secondary (a bordered, muted panel below the
 * statement list, matching the profile "Weitere Nutzer" section's own
 * restrained styling) - the Abrechnungen area itself stays the main
 * focus of this page.
 */
export function AccountingAccessSection({
  propertyId,
  grants,
  properties,
}: {
  propertyId: string;
  grants: AccountingAccessGrant[];
  properties: Property[];
}) {
  const { t } = useTranslations();
  const [inviting, setInviting] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invite, setInvite] = useState<{ email: string; inviteUrl: string } | null>(null);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const result = await inviteAccountingAccessAction(propertyId, formData);
    setPending(false);
    if (!result.ok || !result.inviteUrl) {
      setError(result.message);
      return;
    }
    setInvite({ email: String(formData.get("email") ?? ""), inviteUrl: result.inviteUrl });
    setInviting(false);
  }

  return (
    <div className="rounded-2xl border border-line bg-paper-dim/30 p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium text-ink">{t("accountingAccess.listTitle")}</h2>
          <p className="mt-1 text-xs text-ink-soft">{t("accountingAccess.sectionSubtitle")}</p>
        </div>
        {!invite && (
          <button
            type="button"
            onClick={() => {
              setInviting((value) => !value);
              setError(null);
            }}
            className="rounded-full border border-line px-4 py-2 text-xs font-medium text-ink-soft transition-colors hover:border-ink hover:text-ink"
          >
            {inviting ? t("common.cancel") : t("accountingAccess.inviteButton")}
          </button>
        )}
      </div>

      {inviting && !invite && (
        <form
          action={handleSubmit}
          className="mt-4 flex flex-col gap-3 rounded-2xl border border-line bg-paper p-4 sm:max-w-md"
        >
          <label className="flex flex-col gap-1.5">
            <span className={PROFILE_LABEL_CLASS}>{t("accountingAccess.name")}</span>
            <input name="name" placeholder={t("accountingAccess.namePlaceholder")} className={PROFILE_INPUT_CLASS} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={PROFILE_LABEL_CLASS}>{t("profile.email")}</span>
            <input type="email" name="email" required className={PROFILE_INPUT_CLASS} />
          </label>
          <PropertyScopePicker properties={properties} defaultAllProperties={properties.length <= 1} />
          {error && <p className="text-sm text-ink-soft">{error}</p>}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={pending}
              className="rounded-full bg-ink px-4 py-2 text-xs font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {pending ? t("accountingAccess.inviting") : t("accountingAccess.inviteSubmit")}
            </button>
          </div>
        </form>
      )}

      {invite && (
        <div className="mt-4 max-w-md rounded-2xl border border-line bg-paper p-4">
          <InviteLinkDisplay email={invite.email} inviteUrl={invite.inviteUrl} onDone={() => setInvite(null)} />
        </div>
      )}

      <div className="mt-4 divide-y divide-line">
        {grants.length === 0 && !inviting && <p className="py-3 text-sm text-ink-soft">{t("accountingAccess.noGrants")}</p>}
        {grants.map((grant) => (
          <AccountingAccessRow key={grant.id} propertyId={propertyId} grant={grant} properties={properties} />
        ))}
      </div>
    </div>
  );
}
