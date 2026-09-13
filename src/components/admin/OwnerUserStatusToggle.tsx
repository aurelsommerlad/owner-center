"use client";

import { useState } from "react";
import { AdminConfirmDialog } from "./AdminConfirmDialog";
import { useAdminToast } from "./AdminToast";
import { setOwnerUserStatusAction } from "@/app/admin/actions";
import type { AccountStatus } from "@/types/admin";

export function OwnerUserStatusToggle({
  userId,
  ownerId,
  userName,
  status,
}: {
  userId: string;
  ownerId: string;
  userName: string;
  status: AccountStatus;
}) {
  const [open, setOpen] = useState(false);
  const showToast = useAdminToast();
  const nextStatus: AccountStatus = status === "active" ? "inactive" : "active";
  const actionLabel = status === "active" ? "Deaktivieren" : "Aktivieren";

  async function handleConfirm() {
    const result = await setOwnerUserStatusAction(userId, ownerId, nextStatus, userName);
    setOpen(false);
    if (result.ok) showToast(result.message);
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
        title={`${userName} ${status === "active" ? "deaktivieren" : "aktivieren"}?`}
        description={
          status === "active"
            ? "Dieser Nutzer verliert den Zugriff auf das Owner Center."
            : "Dieser Nutzer erhält wieder Zugriff auf das Owner Center."
        }
        confirmLabel={actionLabel}
        onConfirm={handleConfirm}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
