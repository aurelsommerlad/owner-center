"use client";

import { useState } from "react";
import { endImpersonationAction } from "@/app/admin/actions";

/**
 * Shown only while an admin is previewing the Owner Center via "Als Owner
 * ansehen" (see src/app/[propertyId]/layout.tsx, which only renders this
 * when getEffectiveOwnerContext().isImpersonation is true - never for a
 * real Owner login). Existing UNIQUE-PLACES tokens only, no new warning
 * colour: the same paper/line/ink/positive-dot palette already used
 * elsewhere (see AdminStatusBadge, OccupancyTimeline).
 */
export function ImpersonationBanner({ ownerName }: { ownerName: string }) {
  const [pending, setPending] = useState(false);

  async function handleLeave() {
    setPending(true);
    await endImpersonationAction();
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#E4E0D8] bg-[#F1EDE4] px-4 py-3">
      <div className="flex items-center gap-2.5">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#52664E]" />
        <p className="text-sm text-ink-soft">
          <span className="font-medium text-ink">Owner-Ansicht</span> · Du siehst das Owner Center als{" "}
          <span className="font-medium text-ink">{ownerName}</span>.
        </p>
      </div>
      <button
        type="button"
        onClick={handleLeave}
        disabled={pending}
        className="shrink-0 rounded-full border border-line bg-paper px-4 py-1.5 text-xs font-medium text-ink-soft transition-colors hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Beende…" : "Owner-Ansicht verlassen"}
      </button>
    </div>
  );
}
