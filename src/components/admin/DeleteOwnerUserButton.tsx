"use client";

import { useState } from "react";
import { AdminConfirmDialog } from "./AdminConfirmDialog";
import { useAdminToast } from "./AdminToast";
import { deleteOwnerUserAction } from "@/app/admin/actions";

/**
 * "Nutzer endgültig löschen" - a single OwnerUser login, not the Owner. The
 * server (deleteOwnerUserPermanently) is the authoritative check: this
 * button never disables itself based on a client-side guess - a stale
 * guess could either block a now-valid delete or invite a doomed request,
 * so the click always goes to the server and the exact reason (last
 * active user, wrong role, ...) comes back in the toast.
 */
export function DeleteOwnerUserButton({
  ownerUserId,
  ownerId,
  userName,
}: {
  ownerUserId: string;
  ownerId: string;
  userName: string;
}) {
  const [open, setOpen] = useState(false);
  const showToast = useAdminToast();

  async function handleConfirm() {
    const result = await deleteOwnerUserAction(ownerUserId, ownerId);
    setOpen(false);
    showToast(result.message);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-medium text-status-blocked transition-colors hover:underline"
      >
        Endgültig löschen
      </button>

      <AdminConfirmDialog
        open={open}
        title={`${userName} endgültig löschen?`}
        description="Dieser Vorgang kann nicht rückgängig gemacht werden. Zugehörige Einladungen und Sitzungen dieses Nutzers werden mit entfernt."
        confirmLabel="Endgültig löschen"
        onConfirm={handleConfirm}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
