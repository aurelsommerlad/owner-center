"use client";

import { useState } from "react";
import { AdminConfirmDialog } from "./AdminConfirmDialog";
import { useAdminToast } from "./AdminToast";
import { setOwnerUserStatusAction } from "@/app/admin/actions";
import type { AccountStatus, OwnerUserAccountStatus } from "@/types/admin";

/**
 * "invited" behaves like "active" here (its only available move is
 * "Deaktivieren" - there is no "invited" -> "active" shortcut through this
 * toggle, since that would skip ever setting a real password; see
 * "Einladung neu erstellen" for the actual recovery path from "inactive").
 */
export function OwnerUserStatusToggle({
  userId,
  ownerId,
  userName,
  status,
}: {
  userId: string;
  ownerId: string;
  userName: string;
  status: OwnerUserAccountStatus;
}) {
  const [open, setOpen] = useState(false);
  const showToast = useAdminToast();
  const isActivating = status === "inactive";
  const nextStatus: AccountStatus = isActivating ? "active" : "inactive";
  const actionLabel = isActivating ? "Aktivieren" : "Deaktivieren";

  async function handleConfirm() {
    const result = await setOwnerUserStatusAction(userId, ownerId, nextStatus, userName);
    setOpen(false);
    showToast(result.message);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-medium text-ink-soft transition-colors hover:text-ink"
      >
        {actionLabel}
      </button>
      <AdminConfirmDialog
        open={open}
        title={`${userName} ${isActivating ? "aktivieren" : "deaktivieren"}?`}
        description={
          isActivating
            ? "Dieser Nutzer erhält wieder Zugriff auf das Owner Center."
            : "Dieser Nutzer verliert den Zugriff auf das Owner Center."
        }
        confirmLabel={actionLabel}
        onConfirm={handleConfirm}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
