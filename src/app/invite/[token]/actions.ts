"use server";

import { redirect } from "next/navigation";
import { hashPassword, passwordStrengthError } from "@/server/password";
import { acceptInvitation, lookupInvitationByToken } from "@/server/invitations";

export interface AcceptInvitationResult {
  ok: boolean;
  message: string;
}

/**
 * Public Server Action - deliberately NOT gated by requireAdminRole() or any
 * session check, since a brand-new owner user has no session yet. The only
 * thing that authorizes this call is the token itself (see
 * src/server/invitations.ts#acceptInvitation, which re-validates it inside
 * an atomic transaction rather than trusting the page-load check that
 * rendered the form).
 */
export async function acceptInvitationAction(token: string, formData: FormData): Promise<AcceptInvitationResult> {
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("passwordConfirm") ?? "");

  const strengthError = passwordStrengthError(password);
  if (strengthError) return { ok: false, message: strengthError };
  if (password !== passwordConfirm) return { ok: false, message: "Die Passwörter stimmen nicht überein." };

  // Re-check right before writing too (not just relying on the page's
  // earlier lookup) so a link that expired/was revoked/was already used in
  // the seconds between page load and submit is still rejected with the
  // right message, matching what a fresh page load would show.
  const lookup = await lookupInvitationByToken(token);
  if (lookup.status === "not_found") {
    return { ok: false, message: "Dieser Einladungslink ist ungültig." };
  }
  if (lookup.status === "expired" || lookup.status === "revoked") {
    return { ok: false, message: "Diese Einladung ist nicht mehr gültig. Bitte wenden Sie sich an UNIQUE PLACES." };
  }
  if (lookup.status === "accepted") {
    return { ok: false, message: "Diese Einladung wurde bereits verwendet." };
  }

  const result = await acceptInvitation(token, hashPassword(password));
  if (!result.ok) {
    if (result.reason === "expired" || result.reason === "revoked") {
      return { ok: false, message: "Diese Einladung ist nicht mehr gültig. Bitte wenden Sie sich an UNIQUE PLACES." };
    }
    if (result.reason === "accepted") {
      return { ok: false, message: "Diese Einladung wurde bereits verwendet." };
    }
    return { ok: false, message: "Dieser Einladungslink ist ungültig." };
  }

  redirect("/login");
}
