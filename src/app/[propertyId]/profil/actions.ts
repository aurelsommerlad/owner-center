"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/server/session";
import { requireEffectiveOwnerContext, requireOwnerSelfSession } from "@/server/ownerContext";
import {
  changeOwnPassword,
  inviteOwnerTeamUser,
  recreateOwnTeamInvitation,
  setOwnTeamUserStatus,
  updateOwnProfile,
} from "@/services/profileService";
import { getOwnerLocale } from "@/server/locale";
import { getDictionary, createTranslator } from "@/i18n";

/**
 * Server Actions for the Owner Center's "Profil" page. Every action here
 * resolves the acting owner/user from the current session itself
 * (requireEffectiveOwnerContext()/requireOwnerSelfSession()) - never from
 * an id in `formData` - so this is the actual security boundary, not just
 * which buttons the page happens to render. See src/services/profileService.ts
 * for the underlying data rules (ownership checks, last-active-user guard, ...).
 */

export interface ActionResult {
  ok: boolean;
  message: string;
}

export interface InviteActionResult extends ActionResult {
  inviteToken?: string;
  inviteExpiresAt?: string;
}

function readString(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

/**
 * "Persönliche Daten" -> Speichern. Only ever touches the signed-in user's
 * own User/OwnerUser rows - requireOwnerSelfSession() resolves both ids
 * from the session, never from the form.
 */
export async function updateProfileAction(propertyId: string, formData: FormData): Promise<ActionResult> {
  const self = await requireOwnerSelfSession();
  const locale = await getOwnerLocale();
  const t = createTranslator(getDictionary(locale));

  const firstName = readString(formData, "firstName");
  const lastName = readString(formData, "lastName");
  const email = readString(formData, "email").toLowerCase();
  if (!firstName || !lastName || !email) return { ok: false, message: t("profile.fillAllFields") };

  const emailChanged = email !== self.email.toLowerCase();
  try {
    await updateOwnProfile(self.userId, self.ownerUserId, { firstName, lastName, email }, locale);
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : t("profile.profileUpdateFailed") };
  }

  revalidatePath(`/${propertyId}/profil`);
  return { ok: true, message: emailChanged ? t("profile.emailUpdated") : t("profile.profileUpdated") };
}

/** "Passwort ändern". No display data changes, so no revalidatePath needed. */
export async function changePasswordAction(formData: FormData): Promise<ActionResult> {
  const self = await requireOwnerSelfSession();
  const locale = await getOwnerLocale();
  const t = createTranslator(getDictionary(locale));

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const newPasswordConfirm = String(formData.get("newPasswordConfirm") ?? "");

  try {
    await changeOwnPassword(self.userId, self.sessionId, { currentPassword, newPassword, newPasswordConfirm }, locale);
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : t("profile.passwordChangeFailed") };
  }

  return { ok: true, message: t("profile.passwordChanged") };
}

/**
 * "Nutzer einladen" - creates a new owner-role login under the SIGNED-IN
 * owner's own Owner only: `context.ownerId` comes from
 * requireEffectiveOwnerContext() (the session-derived effective owner,
 * real login or admin preview alike), never from `formData`.
 */
export async function inviteTeamUserAction(propertyId: string, formData: FormData): Promise<InviteActionResult> {
  const context = await requireEffectiveOwnerContext();
  const session = await getSession();
  const locale = await getOwnerLocale();
  const t = createTranslator(getDictionary(locale));
  if (!session) return { ok: false, message: t("profile.pleaseSignInAgain") };

  const firstName = readString(formData, "firstName");
  const lastName = readString(formData, "lastName");
  const email = readString(formData, "email");
  if (!firstName || !lastName || !email) return { ok: false, message: t("profile.fillAllFields") };

  let inviteToken: string;
  let inviteExpiresAt: string;
  try {
    ({ inviteToken, inviteExpiresAt } = await inviteOwnerTeamUser(
      context.ownerId,
      session.userId,
      { firstName, lastName, email },
      locale
    ));
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : t("profile.userCreationFailed") };
  }

  revalidatePath(`/${propertyId}/profil`);
  return {
    ok: true,
    message: t("profile.userInvited", { name: `${firstName} ${lastName}` }),
    inviteToken,
    inviteExpiresAt,
  };
}

/**
 * "Einladung neu erstellen" for a teammate. Ownership (this OwnerUser
 * really belongs to `context.ownerId`) is re-checked inside
 * recreateOwnTeamInvitation itself, not just here.
 */
export async function recreateTeamInvitationAction(propertyId: string, ownerUserId: string): Promise<InviteActionResult> {
  const context = await requireEffectiveOwnerContext();
  const session = await getSession();
  const locale = await getOwnerLocale();
  const t = createTranslator(getDictionary(locale));
  if (!session) return { ok: false, message: t("profile.pleaseSignInAgain") };

  let inviteToken: string;
  let inviteExpiresAt: string;
  try {
    ({ inviteToken, inviteExpiresAt } = await recreateOwnTeamInvitation(
      context.ownerId,
      ownerUserId,
      session.userId,
      locale
    ));
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : t("profile.invitationCreationFailed") };
  }

  revalidatePath(`/${propertyId}/profil`);
  return { ok: true, message: t("profile.newInvitationCreated"), inviteToken, inviteExpiresAt };
}

/**
 * "Nutzer deaktivieren"/"Nutzer reaktivieren" - `ownerUserId` is checked
 * against `context.ownerId` inside setOwnTeamUserStatus() itself (re-read
 * fresh inside its own transaction), so a manipulated id belonging to a
 * different owner's user is rejected there, not just hidden client-side.
 */
export async function setTeamUserStatusAction(
  propertyId: string,
  ownerUserId: string,
  status: "active" | "inactive"
): Promise<ActionResult> {
  const context = await requireEffectiveOwnerContext();
  const locale = await getOwnerLocale();
  const t = createTranslator(getDictionary(locale));

  try {
    const { userName } = await setOwnTeamUserStatus(context.ownerId, ownerUserId, status, locale);
    revalidatePath(`/${propertyId}/profil`);
    return {
      ok: true,
      message: t(status === "active" ? "profile.userActivated" : "profile.userDeactivated", { name: userName }),
    };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : t("profile.statusChangeFailed") };
  }
}
