"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/ui/Card";
import { AdminStatusBadge } from "./AdminStatusBadge";
import { checkApaleoMappingAction, type ApaleoMappingCheckResult } from "@/app/admin/actions";

/**
 * Compact "Mapping prüfen" section for a single property's apaleo mapping.
 * `apaleoPropertyId` stays the explicit, admin-entered id (edited via
 * PropertyFormModal, never auto-matched here) - this component only ever
 * verifies whether it currently resolves in apaleo.
 */
export function ApaleoMappingCard({
  propertyId,
  apaleoPropertyId,
}: {
  propertyId: string;
  apaleoPropertyId?: string;
}) {
  const [result, setResult] = useState<ApaleoMappingCheckResult | null>(null);
  const [pending, startTransition] = useTransition();

  function handleCheck() {
    startTransition(async () => {
      const checkResult = await checkApaleoMappingAction(propertyId);
      setResult(checkResult);
    });
  }

  const badge = !result
    ? { label: "Noch nicht geprüft", tone: "muted" as const }
    : result.ok
      ? { label: "Verbunden", tone: "positive" as const }
      : { label: "Fehler", tone: "strong" as const };

  return (
    <Card className="p-5 shadow-soft sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-sm font-semibold text-ink">apaleo</h2>
        <AdminStatusBadge label={badge.label} tone={badge.tone} />
      </div>

      <div className="mt-3 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.08em] text-ink-soft">Property-ID</p>
          <p className="mt-1 text-sm text-ink">{apaleoPropertyId || "—"}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.08em] text-ink-soft">Property (apaleo)</p>
          <p className="mt-1 text-sm text-ink">{result?.propertyName ?? "—"}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.08em] text-ink-soft">Units</p>
          <p className="mt-1 text-sm text-ink">{result?.unitsCount ?? "—"}</p>
        </div>
      </div>

      {result && !result.ok && <p className="mt-3 text-sm text-ink-soft">{result.message}</p>}

      <div className="mt-4">
        <button
          type="button"
          onClick={handleCheck}
          disabled={!apaleoPropertyId || pending}
          className="rounded-full border border-line px-4 py-2 text-xs font-medium text-ink-soft transition-colors hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Prüfe…" : "Mapping prüfen"}
        </button>
      </div>
    </Card>
  );
}
