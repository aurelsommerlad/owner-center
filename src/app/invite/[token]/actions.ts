"use server";

import { redirect } from "next/navigation";
import { hashPassword, passwordStrengthError } from "@/server/password";
import { acceptInvitation, lookupInvitationByToken } from "@/server/invitations";
import { getDictionary, createTranslator, type Locale } from "@/i18n";

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
export async function acceptInvitationAction(
  token: string,
  formData: FormData,
  locale: Locale = "de"
): Promise<AcceptInvitationResult> {
  const t = createTranslator(getDictionary(locale));
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("passwordConfirm") ?? "");

  const strengthError = passwordStrengthError(password, locale);
  if (strengthError) return { ok: false, message: strengthError };
  if (password !== passwordConfirm) return { ok: false, message: t("invite.passwordsDontMatch") };

  // Re-check right before writing too (not just relying on the page's
  // earlier lookup) so a link that expired/was revoked/was already used in
  // the seconds between page load and submit is still rejected with the
  // right message, matching what a fresh page load would show.
  const lookup = await lookupInvitationByToken(token);
  if (lookup.status === "not_found") {
    return { ok: false, message: t("invite.invalidLink") };
  }
  if (lookup.status === "expired" || lookup.status === "revoked") {
    return { ok: false, message: t("invite.expiredOrRevoked") };
  }
  if (lookup.status === "accepted") {
    return { ok: false, message: t("invite.alreadyAccepted") };
  }

  const result = await acceptInvitation(token, hashPassword(password));
  if (!result.ok) {
    if (result.reason === "expired" || result.reason === "revoked") {
      return { ok: false, message: t("invite.expiredOrRevoked") };
    }
    if (result.reason === "accepted") {
      return { ok: false, message: t("invite.alreadyAccepted") };
    }
    return { ok: false, message: t("invite.invalidLink") };
  }

  // The same /invite/[token] route handles both owner and admin
  // invitations (see acceptInvitation's role branch) - only the
  // post-acceptance destination differs, resolved from the invitation
  // itself (never from client input) so this can't be redirected anywhere
  // else by tampering with the form.
  redirect(result.role === "admin" ? "/admin/login" : "/login");
}
