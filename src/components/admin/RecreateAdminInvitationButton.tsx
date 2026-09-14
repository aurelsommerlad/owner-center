"use client";

import { useState } from "react";
import { AdminModal } from "./AdminModal";
import { AdminConfirmDialog } from "./AdminConfirmDialog";
import { InviteLinkPanel } from "./InviteLinkPanel";
import { recreateAdminInvitationAction } from "@/app/admin/actions";
import { useAdminToast } from "./AdminToast";

/**
 * "Einladung neu erstellen" for a not-yet-active admin - mirrors
 * RecreateInvitationButton (the owner-user version).
 */
export function RecreateAdminInvitationButton({ userId, userName, userEmail }: { userId: string; userName: string; userEmail: string }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [invite, setInvite] = useState<{ inviteUrl: string } | null>(null);
  const showToast = useAdminToast();

  async function handleConfirm() {
    const result = await recreateAdminInvitationAction(userId);
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
        {invite && <InviteLinkPanel email={userEmail} inviteUrl={invite.inviteUrl} onDone={() => setInvite(null)} />}
      </AdminModal>
    </>
  );
}
