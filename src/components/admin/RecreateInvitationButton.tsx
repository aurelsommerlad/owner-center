"use client";

import { useState } from "react";
import { AdminModal } from "./AdminModal";
import { AdminConfirmDialog } from "./AdminConfirmDialog";
import { InviteLinkPanel } from "./InviteLinkPanel";
import { recreateOwnerInvitationAction } from "@/app/admin/actions";
import { useAdminToast } from "./AdminToast";

/**
 * "Einladung neu erstellen": the only way to hand out a fresh, working link
 * for an owner user whose invitation was lost/expired, or to undo an
 * accidental "Benutzer deaktivieren" on someone who never accepted their
 * first invitation. Always invalidates whatever link existed before.
 */
export function RecreateInvitationButton({
  ownerUserId,
  ownerId,
  userName,
  userEmail,
}: {
  ownerUserId: string;
  ownerId: string;
  userName: string;
  userEmail: string;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [invite, setInvite] = useState<{ inviteToken: string } | null>(null);
  const showToast = useAdminToast();

  async function handleConfirm() {
    const result = await recreateOwnerInvitationAction(ownerUserId, ownerId);
    setConfirmOpen(false);
    if (!result.ok || !result.inviteToken) {
      showToast(result.message);
      return;
    }
    setInvite({ inviteToken: result.inviteToken });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        className="text-xs font-medium text-ink-soft transition-colors hover:text-ink"
      >
        Einladung neu erstellen
      </button>

      <AdminConfirmDialog
        open={confirmOpen}
        title={`Neue Einladung für ${userName}?`}
        description="Ein zuvor versendeter Link wird dadurch ungültig."
        confirmLabel="Neue Einladung erstellen"
        onConfirm={handleConfirm}
        onCancel={() => setConfirmOpen(false)}
      />

      <AdminModal open={Boolean(invite)} onClose={() => setInvite(null)} title="Neue Einladung">
        {invite && <InviteLinkPanel email={userEmail} inviteToken={invite.inviteToken} onDone={() => setInvite(null)} />}
      </AdminModal>
    </>
  );
}
