"use client";

import { useState } from "react";
import { inviteTeamUserAction } from "@/app/[propertyId]/profil/actions";
import { TeamUserRow } from "./TeamUserRow";
import { InviteLinkDisplay } from "./InviteLinkDisplay";
import { PROFILE_INPUT_CLASS, PROFILE_LABEL_CLASS } from "./formStyles";
import type { OwnerTeamUser } from "@/types";

/**
 * "Weitere Nutzer" - the team of OwnerUsers under the signed-in effective
 * owner (real login or admin "Als Owner ansehen" preview alike; see
 * src/app/[propertyId]/profil/page.tsx). Works the same in both cases,
 * unlike PersonalDataCard/PasswordChangeCard - there is no "self" identity
 * involved here, only owner-scoped team management, which impersonation
 * already supports throughout the app.
 */
export function TeamUsersSection({ propertyId, team }: { propertyId: string; team: OwnerTeamUser[] }) {
  const [inviting, setInviting] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invite, setInvite] = useState<{ email: string; inviteToken: string } | null>(null);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const result = await inviteTeamUserAction(propertyId, formData);
    setPending(false);
    if (!result.ok || !result.inviteToken) {
      setError(result.message);
      return;
    }
    setInvite({ email: String(formData.get("email") ?? ""), inviteToken: result.inviteToken });
    setInviting(false);
  }

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 className="font-display text-lg italic text-ink">Weitere Nutzer</h2>
          <p className="mt-1 text-xs text-ink-soft">
            Alle Personen mit Zugang zu Ihrem Owner-Center-Konto. Neue Nutzer erhalten einen Einladungslink, um selbst
            ein Passwort festzulegen - noch kein automatischer E-Mail-Versand.
          </p>
        </div>
        {!invite && (
          <button
            type="button"
            onClick={() => {
              setInviting((value) => !value);
              setError(null);
            }}
            className="rounded-full bg-ink px-4 py-2 text-xs font-medium text-paper transition-opacity hover:opacity-90"
          >
            {inviting ? "Abbrechen" : "Nutzer einladen"}
          </button>
        )}
      </div>

      {inviting && !invite && (
        <form
          action={handleSubmit}
          className="mt-4 flex flex-col gap-3 rounded-2xl border border-line bg-paper-dim/40 p-4 sm:max-w-md"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className={PROFILE_LABEL_CLASS}>Vorname</span>
              <input name="firstName" required className={PROFILE_INPUT_CLASS} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={PROFILE_LABEL_CLASS}>Nachname</span>
              <input name="lastName" required className={PROFILE_INPUT_CLASS} />
            </label>
            <label className="flex flex-col gap-1.5 sm:col-span-2">
              <span className={PROFILE_LABEL_CLASS}>E-Mail</span>
              <input type="email" name="email" required className={PROFILE_INPUT_CLASS} />
            </label>
          </div>
          {error && <p className="text-sm text-ink-soft">{error}</p>}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={pending}
              className="rounded-full bg-ink px-4 py-2 text-xs font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {pending ? "Lädt ein…" : "Einladen"}
            </button>
          </div>
        </form>
      )}

      {invite && (
        <div className="mt-4 max-w-md rounded-2xl border border-line bg-paper-dim/40 p-4">
          <InviteLinkDisplay email={invite.email} inviteToken={invite.inviteToken} onDone={() => setInvite(null)} />
        </div>
      )}

      <div className="mt-4 divide-y divide-line">
        {team.length === 0 && <p className="py-3 text-sm text-ink-soft">Noch keine Nutzer.</p>}
        {team.map((user) => (
          <TeamUserRow key={user.id} propertyId={propertyId} user={user} />
        ))}
      </div>
    </div>
  );
}
