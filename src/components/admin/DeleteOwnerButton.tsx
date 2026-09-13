"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminConfirmDialog } from "./AdminConfirmDialog";
import { useAdminToast } from "./AdminToast";
import { deleteOwnerAction } from "@/app/admin/actions";
import type { OwnerDependencySummary } from "@/types/admin";

function describeDependencies(summary: OwnerDependencySummary): string[] {
  const parts: string[] = [];
  if (summary.ownerUserCount > 0) parts.push(`${summary.ownerUserCount} Benutzer`);
  if (summary.propertyAccessCount > 0) parts.push(`${summary.propertyAccessCount} Objektzuordnung(en)`);
  if (summary.statementDocumentCount > 0) parts.push(`${summary.statementDocumentCount} Abrechnungsdokument(e)`);
  if (summary.generalDocumentCount > 0) parts.push(`${summary.generalDocumentCount} sonstige(s) Dokument(e)`);
  return parts;
}

/**
 * "Eigentümer endgültig löschen" - the Gefahrenbereich's most destructive
 * action. Visually restrained (status-blocked terracotta, no red - this app
 * has no alarm-red token, see AdminStatusBadge) but clearly set apart from
 * every other button on the page. `dependencySummary` is only a read-side
 * hint for the admin, rendered from the page's own server-side load - the
 * actual, authoritative block/allow decision always happens again inside
 * deleteOwnerAction's own transaction, so a stale hint can never let a
 * delete through that shouldn't happen (and a hint that's gone stale the
 * other way just means the confirm click comes back with the same exact
 * blocked message instead of succeeding).
 */
export function DeleteOwnerButton({
  ownerId,
  ownerName,
  dependencySummary,
}: {
  ownerId: string;
  ownerName: string;
  dependencySummary: OwnerDependencySummary;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const showToast = useAdminToast();
  const dependencies = describeDependencies(dependencySummary);

  async function handleConfirm() {
    const result = await deleteOwnerAction(ownerId);
    setOpen(false);
    showToast(result.message);
    if (result.ok) router.push("/admin/owners");
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-status-blocked px-4 py-2 text-xs font-medium text-status-blocked transition-colors hover:bg-status-blocked hover:text-paper"
      >
        Eigentümer endgültig löschen
      </button>
      {dependencies.length > 0 && (
        <p className="mt-2 max-w-md text-xs text-ink-soft">
          Noch verknüpft: {dependencies.join(", ")}. Diese Zuordnungen müssen zuerst entfernt werden, bevor ein
          endgültiges Löschen möglich ist.
        </p>
      )}

      <AdminConfirmDialog
        open={open}
        title="Eigentümer endgültig löschen?"
        description="Dieser Vorgang kann nicht rückgängig gemacht werden. Ein endgültiges Löschen ist nur möglich, wenn keine relevanten Zuordnungen oder Dokumente mehr bestehen."
        confirmLabel="Endgültig löschen"
        onConfirm={handleConfirm}
        onCancel={() => setOpen(false)}
      />
    </div>
  );
}
