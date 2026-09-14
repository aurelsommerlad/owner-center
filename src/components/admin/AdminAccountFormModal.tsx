"use client";

import { useState } from "react";
import { AdminModal } from "./AdminModal";
import { ADMIN_INPUT_CLASS, ADMIN_LABEL_CLASS } from "./adminFormStyles";
import { InviteLinkPanel } from "./InviteLinkPanel";
import { createAdminAccountAction } from "@/app/admin/actions";

/**
 * "Admin einladen" - invite-only, unlike OwnerUserFormModal there is no edit
 * mode: the admin list has no "Bearbeiten" action (see AdminAccount), so
 * this component only ever creates a fresh invitation.
 */
export function AdminAccountFormModal({
  triggerLabel,
  triggerClassName,
}: {
  triggerLabel: string;
  triggerClassName: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invite, setInvite] = useState<{ email: string; inviteUrl: string } | null>(null);

  function handleClose() {
    setOpen(false);
    setInvite(null);
    setError(null);
  }

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);

    const result = await createAdminAccountAction(formData);
    setPending(false);
    if (!result.ok || !result.inviteUrl) {
      setError(result.message);
      return;
    }
    setInvite({ email: String(formData.get("email") ?? ""), inviteUrl: result.inviteUrl });
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={triggerClassName}>
        {triggerLabel}
      </button>

      <AdminModal open={open} onClose={handleClose} title="Admin einladen">
        {invite ? (
          <InviteLinkPanel email={invite.email} inviteUrl={invite.inviteUrl} onDone={handleClose} />
        ) : (
          <form action={handleSubmit} className="flex flex-col gap-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className={ADMIN_LABEL_CLASS}>Vorname</span>
                <input name="firstName" required className={ADMIN_INPUT_CLASS} />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={ADMIN_LABEL_CLASS}>Nachname</span>
                <input name="lastName" required className={ADMIN_INPUT_CLASS} />
              </label>
              <label className="flex flex-col gap-1.5 sm:col-span-2">
                <span className={ADMIN_LABEL_CLASS}>E-Mail</span>
                <input type="email" name="email" required className={ADMIN_INPUT_CLASS} />
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
                {pending ? "Speichert…" : "Admin einladen"}
              </button>
            </div>
          </form>
        )}
      </AdminModal>
    </>
  );
}
