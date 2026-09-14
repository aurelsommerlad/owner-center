"use client";

import { useState } from "react";
import { useTranslations } from "@/components/i18n/LocaleProvider";

/**
 * The one place a raw invitation token ever exists in the browser: it
 * arrives here as a Server Action's return value and is used only to build
 * a copyable link - never persisted client-side beyond this component's own
 * state, never sent anywhere else. Same shape/behaviour as the admin area's
 * InviteLinkPanel (components/admin/InviteLinkPanel.tsx) - kept as its own
 * small copy on the Owner Center side rather than a cross-folder import, so
 * the two areas' component trees stay independent.
 */
export function InviteLinkDisplay({
  email,
  inviteToken,
  onDone,
}: {
  email?: string;
  inviteToken: string;
  onDone: () => void;
}) {
  const { t } = useTranslations();
  const [copied, setCopied] = useState(false);
  const inviteUrl = typeof window !== "undefined" ? `${window.location.origin}/invite/${inviteToken}` : "";

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can be unavailable - the link stays visible/selectable by hand.
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-sm font-medium text-ink">{t("profile.invitationCreated")}</p>
        {email && <p className="mt-1 text-xs text-ink-soft">{t("profile.forEmail", { email })}</p>}
      </div>
      <div className="break-all rounded-xl border border-line bg-paper px-3.5 py-2.5 text-xs text-ink">{inviteUrl}</div>
      <p className="text-xs text-ink-soft">{t("profile.inviteLinkNote")}</p>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onDone}
          className="rounded-full border border-line px-4 py-2 text-xs font-medium text-ink-soft transition-colors hover:border-ink hover:text-ink"
        >
          {t("common.done")}
        </button>
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-full bg-ink px-4 py-2 text-xs font-medium text-paper transition-opacity hover:opacity-90"
        >
          {copied ? t("common.linkCopied") : t("common.copyLink")}
        </button>
      </div>
    </div>
  );
}
