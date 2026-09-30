"use client";

import { useState } from "react";
import {
  recreateAccountingInvitationAction,
  setAccountingAccessStatusAction,
  updateAccountingAccessPropertiesAction,
} from "@/app/[propertyId]/abrechnungen/actions";
import { InviteLinkDisplay } from "@/components/profile/InviteLinkDisplay";
import { TeamStatusBadge } from "@/components/profile/TeamStatusBadge";
import { teamUserStatusBadge } from "@/components/profile/teamStatus";
import { PropertyScopePicker } from "./PropertyScopePicker";
import { formatShortDate } from "@/lib/format";
import type { AccountingAccessGrant, Property } from "@/types";
import { useTranslations } from "@/components/i18n/LocaleProvider";

export function AccountingAccessRow({
  propertyId,
  grant,
  properties,
}: {
  propertyId: string;
  grant: AccountingAccessGrant;
  properties: Property[];
}) {
  const { locale, t } = useTranslations();
  const [confirming, setConfirming] = useState(false);
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [invite, setInvite] = useState<{ inviteUrl: string } | null>(null);

  // Same four-state badge (active/invited/expired/deactivated) as "Weitere
  // Nutzer" (see components/profile/teamStatus.ts) - AccountingAccessStatus
  // and OwnerTeamUserStatus are the exact same "active"|"invited"|"inactive"
  // union, so this reuses that logic rather than a second copy of it.
  const statusBadge = teamUserStatusBadge(grant.status, grant.invitationExpiresAt, locale);
  const isActivating = grant.status === "inactive";
  const actionLabel = isActivating ? t("accountingAccess.reactivate") : t("accountingAccess.revoke");
  const scopeLabel = grant.allProperties ? t("accountingAccess.scopeAll") : grant.propertyNames.join(", ");

  function flashMessage(text: string) {
    setMessage(text);
    setTimeout(() => setMessage(null), 4000);
  }

  async function handleStatusChange() {
    setPending(true);
    const result = await setAccountingAccessStatusAction(propertyId, grant.id, isActivating ? "active" : "inactive");
    setPending(false);
    setConfirming(false);
    flashMessage(result.message);
  }

  async function handleRecreateInvitation() {
    setPending(true);
    const result = await recreateAccountingInvitationAction(propertyId, grant.id);
    setPending(false);
    if (!result.ok || !result.inviteUrl) {
      flashMessage(result.message);
      return;
    }
    setInvite({ inviteUrl: result.inviteUrl });
  }

  async function handleUpdateProperties(formData: FormData) {
    setPending(true);
    const result = await updateAccountingAccessPropertiesAction(propertyId, grant.id, formData);
    setPending(false);
    flashMessage(result.message);
    if (result.ok) setEditing(false);
  }

  return (
    <div className="py-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium text-ink">{grant.name || grant.email}</p>
          <p className="text-xs text-ink-soft">
            {grant.name ? `${grant.email} · ` : null}
            {scopeLabel}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-ink-soft">
            {grant.lastLoginAt ? formatShortDate(grant.lastLoginAt, locale) : "—"}
          </span>
          <TeamStatusBadge label={statusBadge.label} tone={statusBadge.tone} />
          {properties.length > 1 && (
            <button
              type="button"
              onClick={() => setEditing((value) => !value)}
              className="text-xs font-medium text-ink-soft transition-colors hover:text-ink"
            >
              {t("accountingAccess.editPermission")}
            </button>
          )}
          {grant.status !== "active" && (
            <button
              type="button"
              onClick={handleRecreateInvitation}
              disabled={pending}
              className="text-xs font-medium text-ink-soft transition-colors hover:text-ink disabled:opacity-50"
            >
              {t("profile.recreateInvitation")}
            </button>
          )}
          {!confirming ? (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="text-xs font-medium text-ink-soft transition-colors hover:text-ink"
            >
              {actionLabel}
            </button>
          ) : (
            <span className="flex items-center gap-2 text-xs">
              <span className="text-ink-soft">{t("profile.confirmQuestion")}</span>
              <button
                type="button"
                onClick={handleStatusChange}
                disabled={pending}
                className="font-medium text-ink hover:underline disabled:opacity-50"
              >
                {pending ? "…" : t("common.yes")}
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="font-medium text-ink-soft hover:text-ink"
              >
                {t("common.cancel")}
              </button>
            </span>
          )}
        </div>
      </div>
      {message && <p className="mt-1 text-xs text-ink-soft">{message}</p>}
      {invite && (
        <div className="mt-3 max-w-md rounded-2xl border border-line bg-paper p-4">
          <InviteLinkDisplay inviteUrl={invite.inviteUrl} onDone={() => setInvite(null)} />
        </div>
      )}
      {editing && (
        <form
          action={handleUpdateProperties}
          className="mt-3 flex flex-col gap-3 rounded-2xl border border-line bg-paper p-4 sm:max-w-md"
        >
          <PropertyScopePicker
            properties={properties}
            defaultAllProperties={grant.allProperties}
            defaultSelectedIds={grant.propertyIds}
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-full border border-line px-4 py-2 text-xs font-medium text-ink-soft transition-colors hover:border-ink hover:text-ink"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-full bg-ink px-4 py-2 text-xs font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {t("accountingAccess.saveProperties")}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
