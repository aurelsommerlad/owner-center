"use client";

import { useState } from "react";
import { startImpersonationAction } from "@/app/admin/actions";

/**
 * "Als Owner ansehen" - starts a secure admin preview (see
 * startImpersonationAction) and navigates into the Owner Center. Real
 * enforcement (admin-only, server-side ownerId validation) happens in the
 * action itself; this button is just the trigger.
 */
export function ViewAsOwnerButton({ ownerId, className }: { ownerId: string; className?: string }) {
  const [pending, setPending] = useState(false);

  async function handleClick() {
    setPending(true);
    await startImpersonationAction(ownerId);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className={
        className ??
        "text-xs font-medium text-ink-soft transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
      }
    >
      {pending ? "Öffne…" : "Als Owner ansehen"}
    </button>
  );
}
