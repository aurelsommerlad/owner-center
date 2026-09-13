import "server-only";
import { prisma } from "@/server/db";
import { toDateString } from "@/server/mapDate";
import { hashPassword, verifyPassword, passwordStrengthError, NO_PASSWORD_SET_HASH } from "@/server/password";
import { createInvitationForUser, createInvitedOwnerUser } from "@/server/invitations";
import type { OwnerProfile, OwnerTeamUser, OwnerTeamUserStatus } from "@/types";

/**
 * Data-access + mutation layer for the Owner Center's "Profil" page: the
 * signed-in owner's own identity (name/email/password) plus the team of
 * OwnerUsers under their own Owner ("Weitere Nutzer"). Deliberately its own
 * file, self-contained on `@/types` only (never `@/types/admin` or
 * services/admin/* - see AGENTS.md-adjacent doc comments on why the two
 * type graphs stay apart), even though some of this logic parallels the
 * admin area's ownerUserService.ts.
 *
 * Every mutation here takes ownerId/userId/ownerUserId as explicit
 * arguments rather than re-deriving them - the caller
 * (src/app/[propertyId]/profil/actions.ts) is responsible for resolving
 * those from the current session via requireEffectiveOwnerContext()/
 * requireOwnerSelfSession(), never from client-supplied form data. That is
 * what actually enforces "ein Owner kann nur eigene Daten ändern und nur
 * Nutzer des eigenen Owners sehen/einladen" - not client-side hiding.
 */

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

interface SelfIdentity {
  userId: string;
  ownerUserId: string;
}

export async function getOwnerProfile(ownerId: string, self: SelfIdentity | null): Promise<OwnerProfile> {
  const [owner, ownerUsers, selfRow] = await Promise.all([
    prisma.owner.findUniqueOrThrow({ where: { id: ownerId } }),
    prisma.ownerUser.findMany({
      where: { ownerId },
      include: { user: { include: { invitations: { orderBy: { createdAt: "desc" }, take: 1 } } } },
      orderBy: { createdAt: "asc" },
    }),
    self
      ? prisma.ownerUser.findUnique({ where: { id: self.ownerUserId }, include: { user: true } })
      : Promise.resolve(null),
  ]);

  const team: OwnerTeamUser[] = ownerUsers.map((ownerUser) => {
    const latestInvitation = ownerUser.user.invitations[0];
    const invitationExpiresAt =
      ownerUser.status === "invited" && latestInvitation && !latestInvitation.acceptedAt && !latestInvitation.revokedAt
        ? toDateString(latestInvitation.expiresAt)
        : undefined;
    return {
      id: ownerUser.id,
      firstName: ownerUser.firstName,
      lastName: ownerUser.lastName,
      email: ownerUser.user.email,
      status: ownerUser.status as OwnerTeamUserStatus,
      invitationExpiresAt,
      lastLoginAt: toDateString(ownerUser.lastLoginAt) ?? undefined,
      isSelf: self ? ownerUser.id === self.ownerUserId : false,
    };
  });

  return {
    ownerName: owner.name,
    ownerCompanyName: owner.companyName ?? undefined,
    self: selfRow ? { firstName: selfRow.firstName, lastName: selfRow.lastName, email: selfRow.user.email } : null,
    team,
  };
}

export interface UpdateOwnProfileInput {
  firstName: string;
  lastName: string;
  email: string;
}

/** "Persönliche Daten" -> Speichern. Never touches Owner/company data - see this file's own doc comment. */
export async function updateOwnProfile(userId: string, ownerUserId: string, input: UpdateOwnProfileInput): Promise<void> {
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const email = input.email.trim().toLowerCase();
  if (!firstName || !lastName) throw new Error("Bitte Vorname und Nachname angeben.");
  if (!isValidEmail(email)) throw new Error("Bitte eine gültige E-Mail-Adresse angeben.");

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing && existing.id !== userId) {
    throw new Error(`Diese E-Mail-Adresse (${email}) ist bereits vergeben.`);
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { email } }),
    prisma.ownerUser.update({ where: { id: ownerUserId }, data: { firstName, lastName } }),
  ]);
}

export interface ChangeOwnPasswordInput {
  currentPassword: string;
  newPassword: string;
  newPasswordConfirm: string;
}

/**
 * "Passwort ändern". Reuses the exact scrypt verify/hash logic from
 * src/server/password.ts - no second hashing method. After a successful
 * change, every OTHER session for this user is invalidated (the session
 * making this change stays alive) - a changed password should end any
 * session that was started with the old one, e.g. on another device.
 */
export async function changeOwnPassword(userId: string, currentSessionId: string, input: ChangeOwnPasswordInput): Promise<void> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (!verifyPassword(input.currentPassword, user.passwordHash)) {
    throw new Error("Das aktuelle Passwort ist nicht korrekt.");
  }

  const strengthError = passwordStrengthError(input.newPassword);
  if (strengthError) throw new Error(strengthError);
  if (input.newPassword !== input.newPasswordConfirm) {
    throw new Error("Die neuen Passwörter stimmen nicht überein.");
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { passwordHash: hashPassword(input.newPassword) } }),
    prisma.session.deleteMany({ where: { userId, id: { not: currentSessionId } } }),
  ]);
}

export interface InviteResult {
  inviteToken: string;
  inviteExpiresAt: string;
}

export interface InviteTeamUserInput {
  firstName: string;
  lastName: string;
  email: string;
}

/**
 * "Nutzer einladen" - reuses createInvitedOwnerUser (the same User+
 * OwnerUser+OwnerInvitation creation the admin area uses), so there is only
 * ever one invite mechanism. `ownerId` is always the acting owner's own id
 * (see this file's own doc comment) - a new team user can never end up
 * under any other Owner.
 */
export async function inviteOwnerTeamUser(
  ownerId: string,
  invitedByUserId: string,
  input: InviteTeamUserInput
): Promise<InviteResult> {
  if (!input.firstName.trim() || !input.lastName.trim()) {
    throw new Error("Bitte Vorname und Nachname angeben.");
  }
  if (!isValidEmail(input.email.trim())) {
    throw new Error("Bitte eine gültige E-Mail-Adresse angeben.");
  }

  const { rawToken, expiresAt } = await createInvitedOwnerUser({ ownerId, ...input }, invitedByUserId);
  return { inviteToken: rawToken, inviteExpiresAt: expiresAt.toISOString() };
}

/**
 * "Einladung neu erstellen" for a teammate. `ownerId` is checked against
 * the target OwnerUser's actual ownerId before touching anything - an
 * owner can never recreate an invitation for a user outside their own team,
 * even by guessing/tampering with an ownerUserId.
 */
export async function recreateOwnTeamInvitation(
  ownerId: string,
  ownerUserId: string,
  requestedByUserId: string
): Promise<InviteResult> {
  const ownerUser = await prisma.ownerUser.findUnique({ where: { id: ownerUserId } });
  if (!ownerUser || ownerUser.ownerId !== ownerId) {
    throw new Error("Nutzer nicht gefunden.");
  }

  const { rawToken, expiresAt } = await createInvitationForUser(ownerUser.userId, requestedByUserId);
  await prisma.ownerUser.update({ where: { id: ownerUserId }, data: { status: "invited" } });
  return { inviteToken: rawToken, inviteExpiresAt: expiresAt.toISOString() };
}

export interface SetTeamUserStatusResult {
  userName: string;
}

/**
 * "Nutzer deaktivieren"/"Nutzer reaktivieren". Re-checks everything inside
 * one transaction (never trusts an earlier read):
 *  - the target OwnerUser must belong to `ownerId` (never another owner's
 *    user, even via a tampered id);
 *  - reactivating requires the user has actually set a real password
 *    already (same rule as the admin area - see NO_PASSWORD_SET_HASH);
 *  - deactivating is refused if it would leave zero active OwnerUsers for
 *    this owner, whoever the target is - this is the one rule behind both
 *    "der letzte aktive Nutzer darf sich nicht selbst deaktivieren" and
 *    "ein Nutzer deaktiviert sich selbst und sperrt sich damit komplett
 *    aus" from the spec: both are just this same count reaching zero.
 */
export async function setOwnTeamUserStatus(
  ownerId: string,
  ownerUserId: string,
  status: "active" | "inactive"
): Promise<SetTeamUserStatusResult> {
  return prisma.$transaction(async (tx) => {
    const ownerUser = await tx.ownerUser.findUnique({ where: { id: ownerUserId }, include: { user: true } });
    if (!ownerUser || ownerUser.ownerId !== ownerId) {
      throw new Error("Nutzer nicht gefunden.");
    }

    if (status === "active" && ownerUser.user.passwordHash === NO_PASSWORD_SET_HASH) {
      throw new Error(
        "Dieser Nutzer hat sein Passwort noch nicht gesetzt. Bitte stattdessen die Einladung neu erstellen."
      );
    }

    if (status === "inactive" && ownerUser.status === "active") {
      const activeCount = await tx.ownerUser.count({ where: { ownerId, status: "active" } });
      if (activeCount <= 1) {
        throw new Error(
          "Der letzte aktive Nutzer kann nicht deaktiviert werden, da sonst niemand mehr Zugriff auf das Owner Center hätte."
        );
      }
    }

    await tx.ownerUser.update({ where: { id: ownerUserId }, data: { status } });
    return { userName: `${ownerUser.firstName} ${ownerUser.lastName}` };
  });
}
