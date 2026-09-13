"use client";

import { useState } from "react";
import { AdminModal } from "./AdminModal";
import { ADMIN_INPUT_CLASS, ADMIN_LABEL_CLASS } from "./adminFormStyles";
import { useAdminToast } from "./AdminToast";
import { createPropertyAction, updatePropertyAction } from "@/app/admin/actions";
import type { AdminOwner, AdminProperty } from "@/types/admin";

/** Create or edit an AdminProperty - same form, only the action + prefilled values differ. */
export function PropertyFormModal({
  property,
  owners,
  ownerIds = [],
  triggerLabel,
  triggerClassName,
}: {
  /** Present -> edit mode, prefilled; absent -> create mode. */
  property?: AdminProperty;
  owners: AdminOwner[];
  /** Owners currently holding active access, for edit mode's pre-checked boxes. */
  ownerIds?: string[];
  triggerLabel: string;
  triggerClassName: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const showToast = useAdminToast();
  const isEdit = Boolean(property);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const result = isEdit ? await updatePropertyAction(property!.id, formData) : await createPropertyAction(formData);
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
      <button type="button" onClick={() => setOpen(true)} className={triggerClassName}>
        {triggerLabel}
      </button>

      <AdminModal
        open={open}
        onClose={() => setOpen(false)}
        title={isEdit ? "Objekt bearbeiten" : "Objekt hinzufügen"}
        widthClassName="max-w-xl"
      >
        <form action={handleSubmit} className="flex flex-col gap-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-soft">Allgemein</p>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className={ADMIN_LABEL_CLASS}>Objektname</span>
                <input name="name" required defaultValue={property?.name} className={ADMIN_INPUT_CLASS} />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={ADMIN_LABEL_CLASS}>Standort</span>
                <input name="location" required defaultValue={property?.location} className={ADMIN_INPUT_CLASS} />
              </label>
            </div>
          </div>

          <div className="border-t border-line pt-4">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-soft">Eigentümer</p>
            <div className="mt-3 flex flex-col gap-2">
              {owners.map((owner) => (
                <label key={owner.id} className="flex items-center gap-2.5 text-sm text-ink">
                  <input
                    type="checkbox"
                    name="ownerIds"
                    value={owner.id}
                    defaultChecked={ownerIds.includes(owner.id)}
                    className="h-4 w-4 rounded border-line accent-ink"
                  />
                  {owner.name}
                </label>
              ))}
            </div>
          </div>

          <div className="border-t border-line pt-4">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-soft">apaleo</p>
            <label className="mt-3 flex flex-col gap-1.5">
              <span className={ADMIN_LABEL_CLASS}>Property-ID (Mock-Konfiguration)</span>
              <input
                name="apaleoPropertyId"
                defaultValue={property?.apaleoPropertyId}
                className={ADMIN_INPUT_CLASS}
                placeholder="noch nicht verbunden"
              />
            </label>
          </div>

          <div className="border-t border-line pt-4">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-soft">Google Drive</p>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className={ADMIN_LABEL_CLASS}>Ordner-ID Abrechnungen</span>
                <input
                  name="statementsDriveFolderId"
                  defaultValue={property?.statementsDriveFolderId}
                  className={ADMIN_INPUT_CLASS}
                  placeholder="noch nicht verbunden"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={ADMIN_LABEL_CLASS}>Ordner-ID Dokumente</span>
                <input
                  name="documentsDriveFolderId"
                  defaultValue={property?.documentsDriveFolderId}
                  className={ADMIN_INPUT_CLASS}
                  placeholder="noch nicht verbunden"
                />
              </label>
            </div>
          </div>

          {error && <p className="text-sm text-ink-soft">{error}</p>}

          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full border border-line px-4 py-2 text-xs font-medium text-ink-soft transition-colors hover:border-ink hover:text-ink"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-full bg-ink px-4 py-2 text-xs font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {pending ? "Speichert…" : isEdit ? "Speichern" : "Objekt anlegen"}
            </button>
          </div>
        </form>
      </AdminModal>
    </>
  );
}
