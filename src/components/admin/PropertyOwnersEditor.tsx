"use client";

import { useState } from "react";
import Link from "next/link";
import { AdminConfirmDialog } from "./AdminConfirmDialog";
import { useAdminToast } from "./AdminToast";
import { ADMIN_SELECT_CLASS } from "./adminFormStyles";
import { assignOwnerToPropertyAction, removeOwnerFromPropertyAction } from "@/app/admin/actions";
import type { AdminOwner } from "@/types/admin";

/**
 * "Eigentümer & Zugriffe" on /admin/properties/[id]: add/remove individual
 * owners for this one property. Goes through the same
 * services/admin/accessService.ts (OwnerPropertyAccess) as the owner-side
 * "Objektzugriff bearbeiten" (EditAccessButton) - no parallel access logic.
 */
export function PropertyOwnersEditor({
  propertyId,
  currentOwners,
  availableOwners,
}: {
  propertyId: string;
  currentOwners: AdminOwner[];
  availableOwners: AdminOwner[];
}) {
  const [selectedOwnerId, setSelectedOwnerId] = useState("");
  const [addPending, setAddPending] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<AdminOwner | null>(null);
  const showToast = useAdminToast();

  async function handleAdd() {
    if (!selectedOwnerId) return;
    setAddPending(true);
    setAddError(null);
    const result = await assignOwnerToPropertyAction(propertyId, selectedOwnerId);
    setAddPending(false);
    if (!result.ok) {
      setAddError(result.message);
      return;
    }
    setSelectedOwnerId("");
    showToast(result.message);
  }

  async function handleRemoveConfirm() {
    if (!removeTarget) return;
    const result = await removeOwnerFromPropertyAction(propertyId, removeTarget.id);
    setRemoveTarget(null);
    if (result.ok) showToast(result.message);
  }

  return (
    <div className="mt-3">
      <div className="divide-y divide-line">
        {currentOwners.length === 0 && <p className="py-3 text-sm text-ink-soft">Noch kein Eigentümer zugeordnet.</p>}
        {currentOwners.map((owner) => (
          <div key={owner.id} className="flex items-center justify-between gap-3 py-3 text-sm">
            <Link href={`/admin/owners/${owner.id}`} className="text-ink transition-colors hover:text-ink-soft">
              {owner.name}
            </Link>
            <div className="flex items-center gap-3">
              {owner.companyName && <span className="text-xs text-ink-soft">{owner.companyName}</span>}
              <button
                type="button"
                onClick={() => setRemoveTarget(owner)}
                className="text-xs font-medium text-ink-soft transition-colors hover:text-ink"
              >
                Entfernen
              </button>
            </div>
          </div>
        ))}
      </div>

      {availableOwners.length > 0 && (
        <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-line pt-4">
          <label className="flex flex-1 flex-col gap-1.5">
            <span className="text-[11px] uppercase tracking-[0.08em] text-ink-soft">Eigentümer hinzufügen</span>
            <select
              value={selectedOwnerId}
              onChange={(event) => setSelectedOwnerId(event.target.value)}
              className={ADMIN_SELECT_CLASS}
            >
              <option value="">Eigentümer wählen…</option>
              {availableOwners.map((owner) => (
                <option key={owner.id} value={owner.id}>
                  {owner.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!selectedOwnerId || addPending}
            className="rounded-full border border-line px-4 py-2.5 text-xs font-medium text-ink-soft transition-colors hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
          >
            {addPending ? "Fügt hinzu…" : "+ Hinzufügen"}
          </button>
        </div>
      )}
      {addError && <p className="mt-2 text-sm text-ink-soft">{addError}</p>}

      <AdminConfirmDialog
        open={removeTarget !== null}
        title={`${removeTarget?.name ?? ""} entfernen?`}
        description="Der Zugriff auf dieses Objekt wird deaktiviert (nicht gelöscht) und kann jederzeit wieder aktiviert werden."
        confirmLabel="Entfernen"
        onConfirm={handleRemoveConfirm}
        onCancel={() => setRemoveTarget(null)}
      />
    </div>
  );
}
