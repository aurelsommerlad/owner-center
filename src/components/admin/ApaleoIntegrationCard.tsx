"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/ui/Card";
import { AdminStatusBadge } from "./AdminStatusBadge";
import { testApaleoConnectionAction } from "@/app/admin/actions";
import { formatShortDateTime } from "@/lib/format";
import type { ApaleoConnectionStatus } from "@/server/integrations/apaleo/connectionCheck";

type LastCheck = ApaleoConnectionStatus["lastCheck"];

export interface ApaleoMappingStats {
  apaleoPropertiesCount: number;
  internalPropertiesCount: number;
  mappedCount: number;
  openCount: number;
}

export function ApaleoIntegrationCard({
  configured,
  lastCheck: initialLastCheck,
  mappingStats,
}: {
  configured: boolean;
  lastCheck: LastCheck;
  /** Live property-mapping coverage, `null` when apaleo is unconfigured/unreachable this render. */
  mappingStats: ApaleoMappingStats | null;
}) {
  const [lastCheck, setLastCheck] = useState(initialLastCheck);
  const [pending, startTransition] = useTransition();

  function handleTest() {
    startTransition(async () => {
      const result = await testApaleoConnectionAction();
      setLastCheck(result ?? null);
    });
  }

  const badge = !configured
    ? { label: "Nicht konfiguriert", tone: "muted" as const }
    : !lastCheck
      ? { label: "Konfiguriert", tone: "neutral" as const }
      : lastCheck.success
        ? { label: "Verbunden", tone: "positive" as const }
        : { label: "Fehler", tone: "strong" as const };

  return (
    <Card className="p-5 shadow-soft sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-sm font-semibold text-ink">apaleo</h2>
        <AdminStatusBadge label={badge.label} tone={badge.tone} />
      </div>
      <p className="mt-2 text-sm text-ink-soft">
        Property-, Einheiten- und Reservierungsdaten direkt aus apaleo übernehmen.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 border-t border-line pt-4 sm:grid-cols-2">
        <div>
          <p className="text-[11px] uppercase tracking-[0.08em] text-ink-soft">Verbindung konfiguriert</p>
          <p className="mt-1 text-sm text-ink">{configured ? "Ja" : "Nein"}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.08em] text-ink-soft">Erkannte Objekte</p>
          <p className="mt-1 text-sm text-ink">{lastCheck?.propertyCount ?? "—"}</p>
        </div>
        <div className="sm:col-span-2">
          <p className="text-[11px] uppercase tracking-[0.08em] text-ink-soft">Letzter erfolgreicher Check</p>
          <p className="mt-1 text-sm text-ink">
            {lastCheck
              ? lastCheck.success
                ? formatShortDateTime(lastCheck.checkedAt)
                : `${formatShortDateTime(lastCheck.checkedAt)} – ${lastCheck.errorMessage}`
              : "Noch nicht geprüft"}
          </p>
        </div>
      </div>

      {mappingStats && (
        <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-line pt-4 sm:grid-cols-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.08em] text-ink-soft">apaleo Properties</p>
            <p className="mt-1 text-sm text-ink">{mappingStats.apaleoPropertiesCount}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.08em] text-ink-soft">Interne Properties</p>
            <p className="mt-1 text-sm text-ink">{mappingStats.internalPropertiesCount}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.08em] text-ink-soft">Gemappt</p>
            <p className="mt-1 text-sm text-ink">{mappingStats.mappedCount}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.08em] text-ink-soft">Offen</p>
            <p className="mt-1 text-sm text-ink">{mappingStats.openCount}</p>
          </div>
        </div>
      )}

      <div className="mt-4">
        <button
          type="button"
          onClick={handleTest}
          disabled={!configured || pending}
          className="rounded-full border border-line px-4 py-2 text-xs font-medium text-ink-soft transition-colors hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Prüfe…" : "Verbindung testen"}
        </button>
      </div>
    </Card>
  );
}
