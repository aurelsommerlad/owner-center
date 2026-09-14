"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { AdminStatusBadge, googleDriveMappingStatusBadge } from "./AdminStatusBadge";
import { useAdminToast } from "./AdminToast";
import { ADMIN_LABEL_CLASS, ADMIN_SELECT_CLASS } from "./adminFormStyles";
import { setGoogleDriveFolderMappingAction } from "@/app/admin/actions";
import type { GoogleDriveMappingStatus } from "@/server/integrations/googleDrive/folderMapping";
import type { GoogleDriveFolderInfo } from "@/server/integrations/googleDrive/types";

/**
 * "Google Drive" on /admin/properties/[id]: a dropdown of the configured
 * root folder's direct child folders (never a free-text folder-id field -
 * see the spec this implements), and "Zuordnung speichern"
 * (setGoogleDriveFolderMappingAction). No document sync/publish happens
 * here - this only ever sets Property.googleDriveFolderId, the mapping a
 * later step will read documents through.
 */
export function GoogleDriveFolderMappingCard({
  propertyId,
  currentFolderId,
  currentFolderName,
  mappingStatus,
  folderOptions,
  driveAvailable,
  driveErrorMessage,
}: {
  propertyId: string;
  currentFolderId?: string;
  currentFolderName?: string;
  mappingStatus: GoogleDriveMappingStatus;
  folderOptions: GoogleDriveFolderInfo[];
  driveAvailable: boolean;
  driveErrorMessage: string | null;
}) {
  const [selected, setSelected] = useState(currentFolderId ?? "");
  const [savePending, setSavePending] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const showToast = useAdminToast();

  async function handleSave() {
    setSavePending(true);
    setSaveError(null);
    const result = await setGoogleDriveFolderMappingAction(propertyId, selected);
    setSavePending(false);
    if (!result.ok) {
      setSaveError(result.message);
      return;
    }
    showToast(result.message);
  }

  const badge = googleDriveMappingStatusBadge(mappingStatus);
  const hasUnsavedChange = selected !== (currentFolderId ?? "");
  const currentMissingFromOptions =
    Boolean(currentFolderId) && !folderOptions.some((option) => option.id === currentFolderId);
  // The selected option's live name from the just-loaded Drive listing takes
  // priority; falling back to currentFolderName covers the moment right
  // after page load, before any change, when selected === currentFolderId.
  const connectedFolderName = selected
    ? (folderOptions.find((option) => option.id === selected)?.name ?? (selected === currentFolderId ? currentFolderName : undefined))
    : undefined;

  return (
    <Card className="p-5 shadow-soft sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-sm font-semibold text-ink">Google Drive</h2>
        <AdminStatusBadge label={badge.label} tone={badge.tone} />
      </div>

      {!driveAvailable && (
        <p className="mt-3 text-sm text-ink-soft">
          Google Drive aktuell nicht verfügbar{driveErrorMessage ? ` – ${driveErrorMessage}` : ""}.
        </p>
      )}

      <div className="mt-4 border-t border-line pt-4">
        <label className="flex flex-col gap-1.5">
          <span className={ADMIN_LABEL_CLASS}>Dokumentenordner</span>
          <select value={selected} onChange={(event) => setSelected(event.target.value)} className={ADMIN_SELECT_CLASS}>
            <option value="">— Keine Verknüpfung —</option>
            {currentMissingFromOptions && (
              <option value={currentFolderId} disabled>
                {currentFolderName ?? currentFolderId} (nicht gefunden)
              </option>
            )}
            {folderOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </label>

        <p className={`mt-3 ${ADMIN_LABEL_CLASS}`}>Verbunden mit</p>
        <p className="mt-1 text-sm text-ink">{connectedFolderName ?? "—"}</p>

        {saveError && <p className="mt-2 text-sm text-ink-soft">{saveError}</p>}

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={savePending || !hasUnsavedChange}
            className="rounded-full bg-ink px-4 py-2 text-xs font-medium text-paper transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {savePending ? "Speichert…" : "Zuordnung speichern"}
          </button>
        </div>
      </div>
    </Card>
  );
}
