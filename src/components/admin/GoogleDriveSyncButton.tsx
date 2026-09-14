"use client";

import { useState } from "react";
import { syncGoogleDriveDocumentsAction } from "@/app/admin/actions";
import { useAdminToast } from "./AdminToast";

/**
 * "Google Drive synchronisieren" on /admin/statements - the one manual
 * trigger for the whole sync (see documentSync.ts; no cron, no automation
 * yet). Shows the full per-run summary inline (not just a toast) since the
 * error count/needs-classification count matter enough to stay visible
 * after the toast fades.
 */
export function GoogleDriveSyncButton() {
  const [pending, setPending] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const showToast = useAdminToast();

  async function handleSync() {
    setPending(true);
    setSummary(null);
    setErrors([]);
    const { message, result } = await syncGoogleDriveDocumentsAction();
    setPending(false);
    setSummary(message);
    setErrors(result.errors);
    showToast(message);
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        type="button"
        onClick={handleSync}
        disabled={pending}
        className="rounded-full bg-ink px-4 py-2 text-xs font-medium text-paper transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Synchronisiert…" : "Google Drive synchronisieren"}
      </button>
      {summary && <p className="max-w-sm text-right text-[11px] text-ink-soft">{summary}</p>}
      {errors.length > 0 && (
        <ul className="max-w-sm list-inside list-disc text-right text-[11px] text-ink-soft">
          {errors.map((error, index) => (
            <li key={index}>{error}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
