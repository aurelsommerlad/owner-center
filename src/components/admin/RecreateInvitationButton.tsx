"use client";

import { useState } from "react";
import { AdminModal } from "./AdminModal";
import { AdminConfirmDialog } from "./AdminConfirmDialog";
import { InviteLinkPanel } from "./InviteLinkPanel";
import { recreateOwnerInvitationAction } from "@/app/admin/actions";
import { useAdminToast } from "./AdminToast";

/**
 * Hands out a fresh, working invitation link for an owner user - for a
 * still-pending invitee (lost/expired link, or undoing an accidental
 * "Benutzer deaktivieren"), or now also for an already-`active` user (e.g.
 * a forgotten password, or just handing them a way to set a new one).
 * Always revokes whatever link existed before (see createInvitationForUser).
 *
 * For an active user this is a real, visible consequence, not just a
 * courtesy resend: recreateOwnerUserInvitation unconditionally puts the
 * OwnerUser back into "invited" status, which is exactly what every access
 * check (getEffectiveOwnerContext et al.) requires to be "active" - so
 * their current access stops immediately, not just once they click the new
 * link. `isActive` swaps in a label/confirmation that says so plainly,
 * rather than reusing the pending-invitee wording ("a previously sent link
 * becomes invalid") that would understate what actually happens here.
 */
export function RecreateInvitationButton({
  ownerUserId,
  ownerId,
  userName,
  userEmail,
  isActive,
}: {
  ownerUserId: string;
  ownerId: string;
  userName: string;
  userEmail: string;
  isActive: boolean;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [invite, setInvite] = useState<{ inviteUrl: string } | null>(null);
  const showToast = useAdminToast();

  async function handleConfirm() {
    const result = await recreateOwnerInvitationAction(ownerUserId, ownerId);
    setConfirmOpen(false);
    if (!result.ok || !result.inviteUrl) {
      showToast(result.message);
      return;
    }
    setInvite({ inviteUrl: result.inviteUrl });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        className="text-xs font-medium text-ink-soft transition-colors hover:text-ink"
      >
        {isActive ? "Einladungslink erstellen" : "Einladung neu erstellen"}
      </button>

      <AdminConfirmDialog
        open={confirmOpen}
        title={isActive ? `Einladungslink für ${userName} erstellen?` : `Neue Einladung für ${userName}?`}
        description={
          isActive
            ? "Der Nutzer verliert dadurch sofort den Zugriff auf das Owner Center, bis er über den neuen Link ein neues Passwort festlegt."
            : "Ein zuvor versendeter Link wird dadurch ungültig."
        }
        confirmLabel={isActive ? "Einladungslink erstellen" : "Neue Einladung erstellen"}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmOpen(false)}
      />

      <AdminModal open={Boolean(invite)} onClose={() => setInvite(null)} title={isActive ? "Einladungslink" : "Neue Einladung"}>
        {invite && <InviteLinkPanel email={userEmail} inviteUrl={invite.inviteUrl} onDone={() => setInvite(null)} />}
      </AdminModal>
    </>
  );
}
