"use client";

import { useState } from "react";
import { AdminModal } from "./AdminModal";
import { ADMIN_INPUT_CLASS, ADMIN_LABEL_CLASS } from "./adminFormStyles";
import { useAdminToast } from "./AdminToast";
import { InviteLinkPanel } from "./InviteLinkPanel";
import { createOwnerUserAction, updateOwnerUserAction } from "@/app/admin/actions";
import type { AdminOwnerUser } from "@/types/admin";

/** Create or edit an AdminOwnerUser - same form, only the action + prefilled values differ. Create mode additionally shows the new invitation link on success instead of just a toast. */
export function OwnerUserFormModal({
  ownerId,
  user,
  triggerLabel,
  triggerClassName,
}: {
  ownerId: string;
  /** Present -> edit mode, prefilled; absent -> create mode. */
  user?: AdminOwnerUser;
  triggerLabel: string;
  triggerClassName: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invite, setInvite] = useState<{ email: string; inviteToken: string } | null>(null);
  const showToast = useAdminToast();
  const isEdit = Boolean(user);

  function handleClose() {
    setOpen(false);
    setInvite(null);
    setError(null);
  }

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);

    if (isEdit) {
      const result = await updateOwnerUserAction(user!.id, ownerId, formData);
      setPending(false);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setOpen(false);
      showToast(result.message);
      return;
    }

    const result = await createOwnerUserAction(formData);
    setPending(false);
    if (!result.ok || !result.inviteToken) {
      setError(result.message);
      return;
    }
    setInvite({ email: String(formData.get("email") ?? ""), inviteToken: result.inviteToken });
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={triggerClassName}>
        {triggerLabel}
      </button>

      <AdminModal open={open} onClose={handleClose} title={isEdit ? "Nutzer bearbeiten" : "Nutzer hinzufügen"}>
        {invite ? (
          <InviteLinkPanel email={invite.email} inviteToken={invite.inviteToken} onDone={handleClose} />
        ) : (
        <form action={handleSubmit} className="flex flex-col gap-5">
          {!isEdit && <input type="hidden" name="ownerId" value={ownerId} />}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className={ADMIN_LABEL_CLASS}>Vorname</span>
              <input name="firstName" required defaultValue={user?.firstName} className={ADMIN_INPUT_CLASS} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={ADMIN_LABEL_CLASS}>Nachname</span>
              <input name="lastName" required defaultValue={user?.lastName} className={ADMIN_INPUT_CLASS} />
            </label>
            <label className="flex flex-col gap-1.5 sm:col-span-2">
              <span className={ADMIN_LABEL_CLASS}>E-Mail</span>
              <input type="email" name="email" required defaultValue={user?.email} className={ADMIN_INPUT_CLASS} />
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
              {pending ? "Speichert…" : isEdit ? "Speichern" : "Nutzer hinzufügen"}
            </button>
          </div>
        </form>
        )}
      </AdminModal>
    </>
  );
}
