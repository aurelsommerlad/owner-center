import { Card } from "@/components/ui/Card";
import { lookupInvitationByToken } from "@/server/invitations";
import { InviteAcceptForm } from "./InviteAcceptForm";

/**
 * Public route - no session/auth guard, reachable by anyone with the link.
 * The token itself is the only credential: lookupInvitationByToken()
 * decides what's shown, and never reveals whether a *different* token
 * would have matched a real user (see its own doc comment).
 */
export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const lookup = await lookupInvitationByToken(token);

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="font-sans text-sm font-semibold tracking-[0.05em] text-ink">UNIQUE PLACES</p>
          <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-ink-soft">Owner Center</p>
        </div>

        <Card className="p-6 shadow-soft-lg sm:p-8">
          {lookup.status === "valid" ? (
            <>
              <h1 className="font-display text-xl italic text-ink">Willkommen im Owner Center</h1>
              <p className="mt-1 text-sm text-ink-soft">
                Für Ihr Konto: <span className="text-ink">{lookup.email}</span>
              </p>
              <div className="mt-6">
                <InviteAcceptForm token={token} />
              </div>
            </>
          ) : (
            <>
              <h1 className="font-display text-xl italic text-ink">Einladung nicht verfügbar</h1>
              <p className="mt-3 text-sm text-ink-soft">
                {lookup.status === "expired" || lookup.status === "revoked"
                  ? "Diese Einladung ist nicht mehr gültig. Bitte wenden Sie sich an UNIQUE PLACES."
                  : lookup.status === "accepted"
                    ? "Diese Einladung wurde bereits verwendet."
                    : "Dieser Einladungslink ist ungültig."}
              </p>
            </>
          )}
        </Card>
      </div>
    </main>
  );
}
