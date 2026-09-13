"use client";

import { useState } from "react";
import { AdminModal } from "./AdminModal";
import { ADMIN_INPUT_CLASS, ADMIN_LABEL_CLASS } from "./adminFormStyles";
import { useAdminToast } from "./AdminToast";
import { createOwnerAction } from "@/app/admin/actions";
import type { AdminProperty } from "@/types/admin";

export function AddOwnerButton({ properties }: { properties: AdminProperty[] }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const showToast = useAdminToast();

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const result = await createOwnerAction(formData);
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
        className="rounded-full bg-ink px-4 py-2 text-xs font-medium text-paper transition-opacity hover:opacity-90"
      >
        + Eigentümer hinzufügen
      </button>

      <AdminModal open={open} onClose={() => setOpen(false)} title="Eigentümer hinzufügen" widthClassName="max-w-xl">
        <form action={handleSubmit} className="flex flex-col gap-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-soft">Eigentümer</p>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className={ADMIN_LABEL_CLASS}>Name</span>
                <input name="name" required className={ADMIN_INPUT_CLASS} placeholder="z. B. Familie Schneider" />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={ADMIN_LABEL_CLASS}>Unternehmen (optional)</span>
                <input
                  name="companyName"
                  className={ADMIN_INPUT_CLASS}
                  placeholder="z. B. Schneider Immobilien GmbH"
                />
              </label>
            </div>
          </div>

          <div className="border-t border-line pt-4">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-soft">Erster Nutzer</p>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
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
          </div>

          {properties.length > 0 && (
            <div className="border-t border-line pt-4">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-soft">Objektzugriff</p>
              <div className="mt-3 flex flex-col gap-2">
                {properties.map((property) => (
                  <label key={property.id} className="flex items-center gap-2.5 text-sm text-ink">
                    <input
                      type="checkbox"
                      name="propertyIds"
                      value={property.id}
                      className="h-4 w-4 rounded border-line accent-ink"
                    />
                    {property.name} · {property.location}
                  </label>
                ))}
              </div>
            </div>
          )}

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
              {pending ? "Speichert…" : "Eigentümer anlegen"}
            </button>
          </div>
        </form>
      </AdminModal>
    </>
  );
}
