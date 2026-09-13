"use client";

import { useState } from "react";
import { AdminConfirmDialog } from "./AdminConfirmDialog";
import { useAdminToast } from "./AdminToast";
import { setOwnerStatusAction } from "@/app/admin/actions";
import type { AccountStatus } from "@/types/admin";

export function OwnerStatusToggle({
  ownerId,
  ownerName,
  status,
  className = "text-xs font-medium text-ink-soft transition-colors hover:text-ink",
}: {
  ownerId: string;
  ownerName: string;
  status: AccountStatus;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const showToast = useAdminToast();
  const nextStatus: AccountStatus = status === "active" ? "inactive" : "active";
  const actionLabel = status === "active" ? "Deaktivieren" : "Aktivieren";

  async function handleConfirm() {
    const result = await setOwnerStatusAction(ownerId, nextStatus, ownerName);
    setOpen(false);
    if (result.ok) showToast(result.message);
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {actionLabel}
      </button>
      <AdminConfirmDialog
        open={open}
        title={`${ownerName} ${status === "active" ? "deaktivieren" : "aktivieren"}?`}
        description={
          status === "active"
            ? "Der Zugang zum Owner Center wird gesperrt. Bestehende Daten und Zuordnungen bleiben erhalten."
            : "Der Eigentümer erhält wieder Zugriff auf das Owner Center."
        }
        confirmLabel={actionLabel}
        onConfirm={handleConfirm}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
