import "server-only";
import type { AdminAccount, AdminAccountStatus } from "@/types/admin";
import { prisma } from "@/server/db";
import { toDateString } from "@/server/mapDate";
import { createInvitationForUser, createInvitedAdmin, type CreateInvitedAdminInput } from "@/server/invitations";
import type { User as DbUser, OwnerInvitation as DbOwnerInvitation } from "@/generated/prisma/client";

/**
 * Reads and writes against the real `User` table, scoped to role "admin"
 * rows only - the admin-account counterpart to ownerUserService.ts. Unlike
 * OwnerUser, an admin account has no separate wrapper table: the User row
 * itself IS the account (see AdminAccount, User.status/User.lastLoginAt in
 * prisma/schema.prisma). Every query here filters on `role: "admin"`
 * explicitly so this module can never accidentally read or mutate an
 * owner-role row.
 */

type AdminUserWithLatestInvitation = DbUser & { invitations: DbOwnerInvitation[] };

const INVITATION_INCLUDE = { invitations: { orderBy: { createdAt: "desc" as const }, take: 1 } };

function toAdminAccount(user: AdminUserWithLatestInvitation): AdminAccount {
  const latestInvitation = user.invitations[0];
  const invitationExpiresAt =
    user.status === "invited" && latestInvitation && !latestInvitation.acceptedAt && !latestInvitation.revokedAt
      ? toDateString(latestInvitation.expiresAt)
      : undefined;

  return {
    id: user.id,
    name: user.name ?? user.email,
    email: user.email,
    status: user.status as AdminAccountStatus,
    invitationExpiresAt,
    lastLoginAt: toDateString(user.lastLoginAt) ?? undefined,
    createdAt: toDateString(user.createdAt),
  };
}

export async function getAdminAccounts(): Promise<AdminAccount[]> {
  const users = await prisma.user.findMany({
    where: { role: "admin" },
    include: INVITATION_INCLUDE,
    orderBy: { createdAt: "asc" },
  });
  return users.map(toAdminAccount);
}

export async function getAdminAccount(id: string): Promise<AdminAccount | undefined> {
  const user = await prisma.user.findUnique({ where: { id }, include: INVITATION_INCLUDE });
  return user && user.role === "admin" ? toAdminAccount(user) : undefined;
}

export interface CreateAdminAccountResult {
  account: AdminAccount;
  inviteToken: string;
  inviteExpiresAt: string;
}

/**
 * "Admin einladen" - reuses createInvitedAdmin (src/server/invitations.ts),
 * which itself reuses createInvitationForUser verbatim: no second invite
 * mechanism, same token generation/hashing/7-day-expiry as owner invites.
 */
export async function createAdminAccount(
  input: CreateInvitedAdminInput,
  createdByAdminId: string
): Promise<CreateAdminAccountResult> {
  const { userId, rawToken, expiresAt } = await createInvitedAdmin(input, createdByAdminId);
  const refreshed = await prisma.user.findUniqueOrThrow({ where: { id: userId }, include: INVITATION_INCLUDE });
  return { account: toAdminAccount(refreshed), inviteToken: rawToken, inviteExpiresAt: expiresAt.toISOString() };
}

export interface RecreateAdminInvitationResult {
  inviteToken: string;
  inviteExpiresAt: string;
}

/**
 * "Einladung neu erstellen" - same recovery path as
 * recreateOwnerUserInvitation: revokes any still-open invitation and issues
 * a fresh one, putting the account back into "invited" status.
 */
export async function recreateAdminInvitation(
  userId: string,
  createdByAdminId: string
): Promise<RecreateAdminInvitationResult> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.role !== "admin") throw new Error("Administrator nicht gefunden.");

  const { rawToken, expiresAt } = await createInvitationForUser(userId, createdByAdminId);
  await prisma.user.update({ where: { id: userId }, data: { status: "invited" } });

  return { inviteToken: rawToken, inviteExpiresAt: expiresAt.toISOString() };
}

export interface AdminAccountActionResult {
  ok: boolean;
  message: string;
}

const LAST_ACTIVE_ADMIN_MESSAGE = "Mindestens ein aktiver Administrator muss bestehen bleiben.";

/**
 * "Deaktivieren"/"Reaktivieren". Refuses two cases the caller (the acting
 * admin's own session, resolved server-side - never a client-supplied id)
 * must never be able to trigger: deactivating one's own account, and
 * deactivating the last remaining active admin. Both checks run here, not
 * just in the UI, since this is also the real authorization boundary for
 * the Server Action that calls it.
 */
export async function setAdminAccountStatus(
  userId: string,
  status: AdminAccountStatus,
  actingAdminUserId: string
): Promise<AdminAccountActionResult> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.role !== "admin") return { ok: false, message: "Administrator nicht gefunden." };

  if (status !== "active") {
    if (userId === actingAdminUserId) {
      return { ok: false, message: "Sie können sich nicht selbst deaktivieren." };
    }
    if (user.status === "active") {
      const activeCount = await prisma.user.count({ where: { role: "admin", status: "active" } });
      if (activeCount <= 1) {
        return { ok: false, message: LAST_ACTIVE_ADMIN_MESSAGE };
      }
    }
  }

  await prisma.user.update({ where: { id: userId }, data: { status } });
  return { ok: true, message: `${user.name ?? user.email} wurde ${status === "active" ? "aktiviert" : "deaktiviert"}.` };
}

/**
 * "Endgültig löschen" - permanently removes a single admin login. Scoped to
 * USER-level relations only, exactly like deleteOwnerUserPermanently:
 *
 *   User -> Session -> OwnerInvitation
 *
 * all `onDelete: Cascade` from User, so one `prisma.user.delete()` removes
 * all three together. `OwnerInvitation.createdByAdminId` and
 * `AdminImpersonation.adminUserId` are deliberately plain scalars, not
 * relations (see their own doc comments) - deleting an admin who once
 * triggered an invitation or an impersonation never cascades into or
 * corrupts those historical/audit rows.
 */
export async function deleteAdminAccountPermanently(
  userId: string,
  actingAdminUserId: string
): Promise<AdminAccountActionResult> {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== "admin") {
      return { ok: false, message: "Administrator nicht gefunden." };
    }

    if (userId === actingAdminUserId) {
      return { ok: false, message: "Sie können Ihr eigenes Konto nicht löschen." };
    }

    if (user.status === "active") {
      const activeCount = await tx.user.count({ where: { role: "admin", status: "active" } });
      if (activeCount <= 1) {
        return { ok: false, message: LAST_ACTIVE_ADMIN_MESSAGE };
      }
    }

    const name = user.name ?? user.email;
    await tx.user.delete({ where: { id: userId } });
    return { ok: true, message: `${name} wurde endgültig gelöscht.` };
  });
}
