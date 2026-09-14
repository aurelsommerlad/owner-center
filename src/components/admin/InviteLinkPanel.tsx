"use client";

import { useState } from "react";

/**
 * The one place the raw invitation link ever exists in the browser:
 * `inviteUrl` arrives here as a Server Action's return value (already built
 * server-side from the app's own APP_URL/request host - see
 * lib/appUrl.ts#getAppUrl) and is only ever displayed/copied - never sent
 * anywhere else, never persisted client-side beyond this component's own
 * state. Once this panel is closed there is no way to see the same link
 * again (the server never stores the raw token - see
 * prisma/schema.prisma#OwnerInvitation) - "Einladung neu erstellen" is
 * the only recovery path, and it invalidates this link.
 */
export function InviteLinkPanel({
  email,
  inviteUrl,
  onDone,
}: {
  email?: string;
  inviteUrl: string;
  onDone: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can be unavailable (insecure context, denied
      // permission) - the link is still shown and selectable by hand.
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-sm font-medium text-ink">Einladung erstellt</p>
        {email && <p className="mt-1 text-xs text-ink-soft">Für {email}</p>}
      </div>
      <div className="break-all rounded-xl border border-line bg-paper-dim/50 px-3.5 py-2.5 text-xs text-ink">
        {inviteUrl}
      </div>
      <p className="text-xs text-ink-soft">
        Dieser Link ist 7 Tage gültig und kann nur einmal verwendet werden. Er wird hier nur jetzt angezeigt - bei
        Bedarf später über „Einladung neu erstellen“ ersetzen.
      </p>
      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <button
          type="button"
          onClick={onDone}
          className="rounded-full border border-line px-4 py-2 text-xs font-medium text-ink-soft transition-colors hover:border-ink hover:text-ink"
        >
          Fertig
        </button>
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-full bg-ink px-4 py-2 text-xs font-medium text-paper transition-opacity hover:opacity-90"
        >
          {copied ? "Kopiert!" : "Link kopieren"}
        </button>
      </div>
    </div>
  );
}
