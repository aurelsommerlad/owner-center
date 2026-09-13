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

  const firstName = readString(formData, "firstName");
  const lastName = readString(formData, "lastName");
  const email = readString(formData, "email").toLowerCase();
  if (!firstName || !lastName || !email) return { ok: false, message: "Bitte alle Felder ausfüllen." };

  const emailChanged = email !== self.email.toLowerCase();
  try {
    await updateOwnProfile(self.userId, self.ownerUserId, { firstName, lastName, email });
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Profil konnte nicht aktualisiert werden." };
  }

  revalidatePath(`/${propertyId}/profil`);
  return { ok: true, message: emailChanged ? "E-Mail-Adresse wurde aktualisiert." : "Profil wurde aktualisiert." };
}

/** "Passwort ändern". No display data changes, so no revalidatePath needed. */
export async function changePasswordAction(formData: FormData): Promise<ActionResult> {
  const self = await requireOwnerSelfSession();

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const newPasswordConfirm = String(formData.get("newPasswordConfirm") ?? "");

  try {
    await changeOwnPassword(self.userId, self.sessionId, { currentPassword, newPassword, newPasswordConfirm });
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Passwort konnte nicht geändert werden." };
  }

  return { ok: true, message: "Passwort wurde geändert." };
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
  if (!session) return { ok: false, message: "Bitte erneut anmelden." };

  const firstName = readString(formData, "firstName");
  const lastName = readString(formData, "lastName");
  const email = readString(formData, "email");
  if (!firstName || !lastName || !email) return { ok: false, message: "Bitte alle Felder ausfüllen." };

  let inviteToken: string;
  let inviteExpiresAt: string;
  try {
    ({ inviteToken, inviteExpiresAt } = await inviteOwnerTeamUser(context.ownerId, session.userId, {
      firstName,
      lastName,
      email,
    }));
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Nutzer konnte nicht angelegt werden." };
  }

  revalidatePath(`/${propertyId}/profil`);
  return { ok: true, message: `${firstName} ${lastName} wurde eingeladen.`, inviteToken, inviteExpiresAt };
}

/**
 * "Einladung neu erstellen" for a teammate. Ownership (this OwnerUser
 * really belongs to `context.ownerId`) is re-checked inside
 * recreateOwnTeamInvitation itself, not just here.
 */
export async function recreateTeamInvitationAction(propertyId: string, ownerUserId: string): Promise<InviteActionResult> {
  const context = await requireEffectiveOwnerContext();
  const session = await getSession();
  if (!session) return { ok: false, message: "Bitte erneut anmelden." };

  let inviteToken: string;
  let inviteExpiresAt: string;
  try {
    ({ inviteToken, inviteExpiresAt } = await recreateOwnTeamInvitation(context.ownerId, ownerUserId, session.userId));
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Einladung konnte nicht erstellt werden." };
  }

  revalidatePath(`/${propertyId}/profil`);
  return { ok: true, message: "Neue Einladung erstellt.", inviteToken, inviteExpiresAt };
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

  try {
    const { userName } = await setOwnTeamUserStatus(context.ownerId, ownerUserId, status);
    revalidatePath(`/${propertyId}/profil`);
    return { ok: true, message: `${userName} wurde ${status === "active" ? "aktiviert" : "deaktiviert"}.` };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Status konnte nicht geändert werden." };
  }
}
