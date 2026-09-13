"use client";

import { useState } from "react";
import { AdminModal } from "./AdminModal";
import { ADMIN_INPUT_CLASS, ADMIN_LABEL_CLASS } from "./adminFormStyles";
import { useAdminToast } from "./AdminToast";
import { updateOwnerAction } from "@/app/admin/actions";
import type { AdminOwner } from "@/types/admin";

/**
 * "Eigentümerdaten bearbeiten" - master-data only (Name/Unternehmen). Never
 * shows Status or any User/OwnerUser field: status has its own
 * confirmation-gated flow (OwnerStatusToggle) and per-user data lives on
 * OwnerUserFormModal, kept deliberately separate from Owner master data.
 */
export function EditOwnerButton({ owner }: { owner: AdminOwner }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const showToast = useAdminToast();

  function handleClose() {
    setOpen(false);
    setError(null);
  }

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const result = await updateOwnerAction(owner.id, formData);
    setPending(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setOpen(false);
    showToast(result.message);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-line px-4 py-2 text-xs font-medium text-ink-soft transition-colors hover:border-ink hover:text-ink"
      >
        Bearbeiten
      </button>

      <AdminModal open={open} onClose={handleClose} title="Eigentümerdaten bearbeiten">
        <form action={handleSubmit} className="flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className={ADMIN_LABEL_CLASS}>Name</span>
              <input name="name" required defaultValue={owner.name} className={ADMIN_INPUT_CLASS} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={ADMIN_LABEL_CLASS}>Unternehmen</span>
              <input name="companyName" defaultValue={owner.companyName} className={ADMIN_INPUT_CLASS} />
            </label>
          </div>

          {error && <p className="text-sm text-ink-soft">{error}</p>}

          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-full border border-line px-4 py-2 text-xs font-medium text-ink-soft transition-colors hover:border-ink hover:text-ink"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-full bg-ink px-4 py-2 text-xs font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {pending ? "Speichert…" : "Speichern"}
            </button>
          </div>
        </form>
      </AdminModal>
    </>
  );
}
