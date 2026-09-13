"use client";

import { useState } from "react";
import { recreateTeamInvitationAction, setTeamUserStatusAction } from "@/app/[propertyId]/profil/actions";
import { InviteLinkDisplay } from "./InviteLinkDisplay";
import { TeamStatusBadge } from "./TeamStatusBadge";
import { teamUserStatusBadge } from "./teamStatus";
import { formatShortDate } from "@/lib/format";
import type { OwnerTeamUser } from "@/types";

export function TeamUserRow({ propertyId, user }: { propertyId: string; user: OwnerTeamUser }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [invite, setInvite] = useState<{ inviteToken: string } | null>(null);

  const statusBadge = teamUserStatusBadge(user.status, user.invitationExpiresAt);
  const isActivating = user.status === "inactive";
  const actionLabel = isActivating ? "Aktivieren" : "Deaktivieren";

  function flashMessage(text: string) {
    setMessage(text);
    setTimeout(() => setMessage(null), 4000);
  }

  async function handleStatusChange() {
    setPending(true);
    const result = await setTeamUserStatusAction(propertyId, user.id, isActivating ? "active" : "inactive");
    setPending(false);
    setConfirming(false);
    flashMessage(result.message);
  }

  async function handleRecreateInvitation() {
    setPending(true);
    const result = await recreateTeamInvitationAction(propertyId, user.id);
    setPending(false);
    if (!result.ok || !result.inviteToken) {
      flashMessage(result.message);
      return;
    }
    setInvite({ inviteToken: result.inviteToken });
  }

  return (
    <div className="py-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium text-ink">
            {user.firstName} {user.lastName}
            {user.isSelf && <span className="ml-2 text-xs font-normal text-ink-soft">(Sie)</span>}
          </p>
          <p className="text-xs text-ink-soft">{user.email}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-ink-soft">{user.lastLoginAt ? formatShortDate(user.lastLoginAt) : "—"}</span>
          <TeamStatusBadge label={statusBadge.label} tone={statusBadge.tone} />
          {user.status !== "active" && (
            <button
              type="button"
              onClick={handleRecreateInvitation}
              disabled={pending}
              className="text-xs font-medium text-ink-soft transition-colors hover:text-ink disabled:opacity-50"
            >
              Einladung neu erstellen
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
              <span className="text-ink-soft">Sicher?</span>
              <button
                type="button"
                onClick={handleStatusChange}
                disabled={pending}
                className="font-medium text-ink hover:underline disabled:opacity-50"
              >
                {pending ? "…" : "Ja"}
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="font-medium text-ink-soft hover:text-ink"
              >
                Abbrechen
              </button>
            </span>
          )}
        </div>
      </div>
      {message && <p className="mt-1 text-xs text-ink-soft">{message}</p>}
      {invite && (
        <div className="mt-3 max-w-md rounded-2xl border border-line bg-paper-dim/40 p-4">
          <InviteLinkDisplay inviteToken={invite.inviteToken} onDone={() => setInvite(null)} />
        </div>
      )}
    </div>
  );
}
