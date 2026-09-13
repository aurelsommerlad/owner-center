"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/ui/Card";
import { AdminStatusBadge } from "./AdminStatusBadge";
import { testGoogleDriveConnectionAction } from "@/app/admin/actions";
import { formatShortDateTime } from "@/lib/format";
import type { GoogleDriveConnectionStatus } from "@/server/integrations/googleDrive/connectionCheck";

type LastCheck = GoogleDriveConnectionStatus["lastCheck"];

export function GoogleDriveIntegrationCard({
  configured,
  lastCheck: initialLastCheck,
}: {
  configured: boolean;
  lastCheck: LastCheck;
}) {
  const [lastCheck, setLastCheck] = useState(initialLastCheck);
  const [pending, startTransition] = useTransition();

  function handleTest() {
    startTransition(async () => {
      const result = await testGoogleDriveConnectionAction();
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
        <h2 className="text-sm font-semibold text-ink">Google Drive</h2>
        <AdminStatusBadge label={badge.label} tone={badge.tone} />
      </div>
      <p className="mt-2 text-sm text-ink-soft">
        Dokumentenquelle für Eigentümerreportings, Rechnungen, Gutschriften und weitere Dokumente.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 border-t border-line pt-4 sm:grid-cols-2">
        <div>
          <p className="text-[11px] uppercase tracking-[0.08em] text-ink-soft">Verbindung konfiguriert</p>
          <p className="mt-1 text-sm text-ink">{configured ? "Ja" : "Nein"}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.08em] text-ink-soft">Root-Ordner</p>
          <p className="mt-1 text-sm text-ink">{lastCheck?.rootFolderName ?? "—"}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.08em] text-ink-soft">Erkannte Elemente</p>
          <p className="mt-1 text-sm text-ink">{lastCheck?.itemCount ?? "—"}</p>
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
