"use client";

import { useState } from "react";
import { AdminModal } from "./AdminModal";
import { useAdminToast } from "./AdminToast";
import { updateOwnerAccessAction } from "@/app/admin/actions";
import type { AdminProperty } from "@/types/admin";

export function EditAccessButton({
  ownerId,
  ownerName,
  allProperties,
  activePropertyIds,
}: {
  ownerId: string;
  ownerName: string;
  allProperties: AdminProperty[];
  activePropertyIds: string[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set(activePropertyIds));
  const showToast = useAdminToast();

  function toggle(propertyId: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(propertyId)) next.delete(propertyId);
      else next.add(propertyId);
      return next;
    });
  }

  async function handleSave() {
    setPending(true);
    const result = await updateOwnerAccessAction(ownerId, Array.from(selected));
    setPending(false);
    setOpen(false);
    if (result.ok) showToast(result.message);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setSelected(new Set(activePropertyIds));
          setOpen(true);
        }}
        className="text-xs font-medium text-ink-soft transition-colors hover:text-ink"
      >
        Objektzugriff bearbeiten
      </button>

      <AdminModal
        open={open}
        onClose={() => setOpen(false)}
        title="Objektzugriff bearbeiten"
        description={`Welche Objekte darf ${ownerName} sehen?`}
      >
        <div className="flex flex-col gap-2">
          {allProperties.map((property) => (
            <label key={property.id} className="flex items-center gap-2.5 text-sm text-ink">
              <input
                type="checkbox"
                checked={selected.has(property.id)}
                onChange={() => toggle(property.id)}
                className="h-4 w-4 rounded border-line accent-ink"
              />
              {property.name} · {property.location}
            </label>
          ))}
        </div>

        <div className="mt-5 flex justify-end gap-2 border-t border-line pt-4">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-full border border-line px-4 py-2 text-xs font-medium text-ink-soft transition-colors hover:border-ink hover:text-ink"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={pending}
            className="rounded-full bg-ink px-4 py-2 text-xs font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "Speichert…" : "Speichern"}
          </button>
        </div>
      </AdminModal>
    </>
  );
}
