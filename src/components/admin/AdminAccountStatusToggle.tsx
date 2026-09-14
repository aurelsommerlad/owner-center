"use client";

import { useState } from "react";
import { AdminConfirmDialog } from "./AdminConfirmDialog";
import { useAdminToast } from "./AdminToast";
import { setAdminAccountStatusAction } from "@/app/admin/actions";
import type { AccountStatus, AdminAccountStatus } from "@/types/admin";

/**
 * "Deaktivieren"/"Reaktivieren" - mirrors OwnerUserStatusToggle. The real
 * self/last-active-admin protection lives server-side
 * (adminUserService.ts#setAdminAccountStatus); this button never disables
 * itself based on a client-side guess about whether the target is "the last
 * active admin" - the exact reason always comes back in the toast.
 */
export function AdminAccountStatusToggle({
  userId,
  userName,
  status,
}: {
  userId: string;
  userName: string;
  status: AdminAccountStatus;
}) {
  const [open, setOpen] = useState(false);
  const showToast = useAdminToast();
  const isActivating = status === "inactive";
  const nextStatus: AccountStatus = isActivating ? "active" : "inactive";
  const actionLabel = isActivating ? "Reaktivieren" : "Deaktivieren";

  async function handleConfirm() {
    const result = await setAdminAccountStatusAction(userId, nextStatus);
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
        title={`${userName} ${isActivating ? "reaktivieren" : "deaktivieren"}?`}
        description={
          isActivating
            ? "Dieser Administrator erhält wieder Zugriff auf den Admin-Bereich."
            : "Dieser Administrator verliert den Zugriff auf den Admin-Bereich."
        }
        confirmLabel={actionLabel}
        onConfirm={handleConfirm}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
