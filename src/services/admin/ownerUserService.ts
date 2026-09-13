import type { AccountStatus, AdminOwnerUser } from "@/types/admin";
import { prisma } from "@/server/db";
import { NO_PASSWORD_SET_HASH } from "@/server/password";
import { createInvitationForUser, createInvitedOwnerUser } from "@/server/invitations";
import { getUsersForOwner, toAdminOwnerUser } from "@/lib/adminPermissions";

/**
 * Reads and writes against the real `OwnerUser`/`User` tables. Creating an
 * owner login creates a `User` row (email, but no usable password yet - see
 * NO_PASSWORD_SET_HASH) plus the `OwnerUser` link with status "invited",
 * then issues an OwnerInvitation (src/server/invitations.ts) so the person
 * sets their own password via /invite/[token]. The admin never sees or
 * chooses a password for someone else.
 */

const INVITATION_INCLUDE = { user: { include: { invitations: { orderBy: { createdAt: "desc" as const }, take: 1 } } } };

export async function getOwnerUsers(ownerId: string): Promise<AdminOwnerUser[]> {
  return getUsersForOwner(ownerId);
}

export async function getOwnerUser(id: string): Promise<AdminOwnerUser | undefined> {
  const ownerUser = await prisma.ownerUser.findUnique({ where: { id }, include: INVITATION_INCLUDE });
  return ownerUser ? toAdminOwnerUser(ownerUser) : undefined;
}

export interface CreateOwnerUserInput {
  ownerId: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface CreateOwnerUserResult {
  user: AdminOwnerUser;
  inviteToken: string;
  inviteExpiresAt: string;
}

export async function createOwnerUser(
  input: CreateOwnerUserInput,
  createdByAdminId: string
): Promise<CreateOwnerUserResult> {
  const { ownerUserId, rawToken, expiresAt } = await createInvitedOwnerUser(input, createdByAdminId);
  // Re-read (with the invitation include) so the returned AdminOwnerUser
  // carries the invitation just created.
  const refreshed = await prisma.ownerUser.findUniqueOrThrow({ where: { id: ownerUserId }, include: INVITATION_INCLUDE });

  return { user: toAdminOwnerUser(refreshed), inviteToken: rawToken, inviteExpiresAt: expiresAt.toISOString() };
}

export interface RecreateInvitationResult {
  inviteToken: string;
  inviteExpiresAt: string;
}

/**
 * "Einladung neu erstellen": issues a fresh invitation (revoking any still-
 * open one - see createInvitationForUser) and puts the OwnerUser back into
 * "invited" status, whatever it was before (covers both "link expired/lost,
 * resend" and "I deactivated this invitee by mistake, redo it").
 */
export async function recreateOwnerUserInvitation(
  ownerUserId: string,
  createdByAdminId: string
): Promise<RecreateInvitationResult> {
  const ownerUser = await prisma.ownerUser.findUnique({ where: { id: ownerUserId } });
  if (!ownerUser) throw new Error("Nutzer nicht gefunden.");

  const { rawToken, expiresAt } = await createInvitationForUser(ownerUser.userId, createdByAdminId);
  await prisma.ownerUser.update({ where: { id: ownerUserId }, data: { status: "invited" } });

  return { inviteToken: rawToken, inviteExpiresAt: expiresAt.toISOString() };
}

export interface UpdateOwnerUserInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  status?: AccountStatus;
}

export async function updateOwnerUser(id: string, input: UpdateOwnerUserInput): Promise<AdminOwnerUser | undefined> {
  const ownerUser = await prisma.ownerUser.findUnique({ where: { id }, include: { user: true } });
  if (!ownerUser) return undefined;

  if (input.email !== undefined) {
    const email = input.email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing && existing.id !== ownerUser.userId) {
      throw new Error(`Diese E-Mail-Adresse (${email}) ist bereits vergeben.`);
    }
    await prisma.user.update({ where: { id: ownerUser.userId }, data: { email } });
  }

  // "Aktivieren" only ever makes sense for someone who has a real password
  // already - flipping status to "active" for a user who never accepted
  // their invitation (still NO_PASSWORD_SET_HASH) would grant an account
  // nobody can actually log into. "Einladung neu erstellen" is the correct
  // recovery path there instead (see recreateOwnerUserInvitation).
  if (input.status === "active" && ownerUser.user.passwordHash === NO_PASSWORD_SET_HASH) {
    throw new Error(
      "Dieser Nutzer hat sein Passwort noch nicht gesetzt. Bitte stattdessen die Einladung neu erstellen."
    );
  }

  const updated = await prisma.ownerUser.update({
    where: { id },
    data: {
      firstName: input.firstName,
      lastName: input.lastName,
      status: input.status,
    },
    include: INVITATION_INCLUDE,
  });
  return toAdminOwnerUser(updated);
}

export async function setOwnerUserStatus(id: string, status: AccountStatus): Promise<AdminOwnerUser | undefined> {
  return updateOwnerUser(id, { status });
}

export interface DeleteOwnerUserResult {
  ok: boolean;
  message: string;
}

/**
 * "Nutzer endgültig löschen" - permanently removes a single OwnerUser login,
 * deliberately scoped to USER-level relations only:
 *
 *   User -> OwnerUser -> Session -> OwnerInvitation
 *
 * `OwnerPropertyAccess` (and StatementDocument/GeneralDocument) belong to
 * the OWNER, not to any individual OwnerUser - see prisma/schema.prisma,
 * where none of them carry a `userId`/`ownerUserId` column at all - so a
 * user is NEVER blocked from deletion by the owner still holding
 * properties or documents. That is a distinct, separate decision (see
 * ownerService.ts#deleteOwnerPermanently, which deletes the whole Owner
 * company record and rightly blocks on those - a different operation from
 * this one, which only ever removes one login).
 *
 * A single `prisma.user.delete()` is enough: prisma/schema.prisma declares
 * `onDelete: Cascade` from User to OwnerUser, Session, and OwnerInvitation
 * (every relation that actually points at a User row), so all three are
 * removed together as one controlled operation - no separate cleanup
 * needed, and nothing outside those three is ever touched. There is
 * currently no audit/tracking table in the schema that references a User
 * by id (OwnerInvitation.createdByAdminId and AdminImpersonation.adminUserId
 * are deliberately plain scalars, not relations - see their own doc
 * comments - so deleting a user who once triggered an invitation or a
 * preview never cascades into or corrupts those historical rows).
 */
export async function deleteOwnerUserPermanently(ownerUserId: string): Promise<DeleteOwnerUserResult> {
  return prisma.$transaction(async (tx) => {
    const ownerUser = await tx.ownerUser.findUnique({ where: { id: ownerUserId }, include: { user: true } });
    if (!ownerUser) {
      return { ok: false, message: "Dieser Benutzer wurde nicht gefunden." };
    }

    // Defensive: an OwnerUser row should never point at anything but a
    // role="owner" User. Refuse rather than ever let this path touch an
    // admin login, even if some future bug or data issue produced such a
    // row - the Eigentümerverwaltung must never be a way to delete admins.
    if (ownerUser.user.role !== "owner") {
      return { ok: false, message: "Dieser Benutzer kann über die Eigentümerverwaltung nicht gelöscht werden." };
    }

    if (ownerUser.status === "active") {
      const activeCount = await tx.ownerUser.count({ where: { ownerId: ownerUser.ownerId, status: "active" } });
      if (activeCount <= 1) {
        return {
          ok: false,
          message: "Dieser Benutzer kann nicht gelöscht werden, weil er der letzte aktive Zugang dieses Eigentümers ist.",
        };
      }
    }

    const userName = `${ownerUser.firstName} ${ownerUser.lastName}`;
    await tx.user.delete({ where: { id: ownerUser.userId } });
    return { ok: true, message: `${userName} wurde endgültig gelöscht.` };
  });
}
