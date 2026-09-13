"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { AdminStatusBadge, apaleoMappingStatusBadge } from "./AdminStatusBadge";
import { useAdminToast } from "./AdminToast";
import { ADMIN_SELECT_CLASS } from "./adminFormStyles";
import {
  checkApaleoMappingAction,
  setApaleoPropertyMappingAction,
  type ApaleoMappingCheckResult,
} from "@/app/admin/actions";
import type { ApaleoMappingStatus } from "@/server/integrations/apaleo/mappingStatus";
import type { ApaleoPropertySummary, ApaleoUnitSummary } from "@/server/integrations/apaleo/types";

/**
 * "apaleo-Verknüpfung" on /admin/properties/[id]: current mapping, a
 * dropdown of available (unmapped, or currently-this-property's) apaleo
 * properties, "Verknüpfung speichern" (setApaleoPropertyMappingAction) and
 * "Mapping prüfen" (checkApaleoMappingAction, unchanged from before) as two
 * deliberately separate actions - saving never re-derives or auto-matches
 * anything, checking never changes the stored mapping.
 */
export function ApaleoPropertyMappingCard({
  propertyId,
  propertyName,
  propertyLocation,
  currentApaleoPropertyId,
  currentApaleoPropertyName,
  mappingStatus,
  apaleoOptions,
  apaleoAvailable,
  apaleoErrorMessage,
  unitsPreview,
  unitsPreviewError,
}: {
  propertyId: string;
  propertyName: string;
  propertyLocation: string;
  currentApaleoPropertyId?: string;
  currentApaleoPropertyName?: string;
  mappingStatus: ApaleoMappingStatus;
  apaleoOptions: ApaleoPropertySummary[];
  apaleoAvailable: boolean;
  apaleoErrorMessage: string | null;
  unitsPreview: ApaleoUnitSummary[] | null;
  unitsPreviewError: string | null;
}) {
  const [selected, setSelected] = useState(currentApaleoPropertyId ?? "");
  const [savePending, setSavePending] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [checkPending, setCheckPending] = useState(false);
  const [checkResult, setCheckResult] = useState<ApaleoMappingCheckResult | null>(null);
  const showToast = useAdminToast();

  async function handleSave() {
    setSavePending(true);
    setSaveError(null);
    const result = await setApaleoPropertyMappingAction(propertyId, selected);
    setSavePending(false);
    if (!result.ok) {
      setSaveError(result.message);
      return;
    }
    setCheckResult(null);
    showToast(result.message);
  }

  async function handleCheck() {
    setCheckPending(true);
    const result = await checkApaleoMappingAction(propertyId);
    setCheckPending(false);
    setCheckResult(result);
  }

  const badge = apaleoMappingStatusBadge(mappingStatus);
  const hasUnsavedChange = selected !== (currentApaleoPropertyId ?? "");
  const currentMissingFromOptions =
    Boolean(currentApaleoPropertyId) && !apaleoOptions.some((option) => option.id === currentApaleoPropertyId);

  return (
    <Card className="p-5 shadow-soft sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-sm font-semibold text-ink">apaleo-Verknüpfung</h2>
        <AdminStatusBadge label={badge.label} tone={badge.tone} />
      </div>

      <div className="mt-3 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
        <div>
          <p className="text-[11px] uppercase tracking-[0.08em] text-ink-soft">Internes Objekt</p>
          <p className="mt-1 text-sm text-ink">
            {propertyName} · {propertyLocation}
          </p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.08em] text-ink-soft">apaleo Property</p>
          <p className="mt-1 text-sm text-ink">
            {currentApaleoPropertyId ? `${currentApaleoPropertyName ?? "—"} (${currentApaleoPropertyId})` : "—"}
          </p>
        </div>
      </div>

      {!apaleoAvailable && (
        <p className="mt-3 text-sm text-ink-soft">
          apaleo-Daten aktuell nicht verfügbar{apaleoErrorMessage ? ` – ${apaleoErrorMessage}` : ""}.
        </p>
      )}

      <div className="mt-4 border-t border-line pt-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] uppercase tracking-[0.08em] text-ink-soft">apaleo Property wählen</span>
          <select value={selected} onChange={(event) => setSelected(event.target.value)} className={ADMIN_SELECT_CLASS}>
            <option value="">— Keine Verknüpfung —</option>
            {currentMissingFromOptions && (
              <option value={currentApaleoPropertyId} disabled>
                {currentApaleoPropertyId} (nicht gefunden)
              </option>
            )}
            {apaleoOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name} ({option.id})
              </option>
            ))}
          </select>
        </label>

        {saveError && <p className="mt-2 text-sm text-ink-soft">{saveError}</p>}

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={savePending || !hasUnsavedChange}
            className="rounded-full bg-ink px-4 py-2 text-xs font-medium text-paper transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {savePending ? "Speichert…" : "Verknüpfung speichern"}
          </button>
          <button
            type="button"
            onClick={handleCheck}
            disabled={checkPending || !currentApaleoPropertyId}
            className="rounded-full border border-line px-4 py-2 text-xs font-medium text-ink-soft transition-colors hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
          >
            {checkPending ? "Prüfe…" : "Mapping prüfen"}
          </button>
        </div>

        {checkResult && (
          <p className="mt-3 text-sm text-ink-soft">
            {checkResult.ok
              ? `Verbindung erfolgreich – Property: ${checkResult.propertyName}, Einheiten: ${checkResult.unitsCount ?? "—"}.`
              : checkResult.message}
          </p>
        )}
      </div>

      {currentApaleoPropertyId && (unitsPreview || unitsPreviewError) && (
        <div className="mt-4 border-t border-line pt-4">
          <p className="text-[11px] uppercase tracking-[0.08em] text-ink-soft">Einheiten aus apaleo</p>
          {unitsPreviewError ? (
            <p className="mt-2 text-sm text-ink-soft">{unitsPreviewError}</p>
          ) : (
            <>
              <p className="mt-1 text-sm text-ink">{unitsPreview!.length} Einheiten erkannt</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {unitsPreview!.map((unit) => (
                  <span key={unit.id} className="rounded-full border border-line bg-paper px-2.5 py-1 text-xs text-ink-soft">
                    {unit.name}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </Card>
  );
}
