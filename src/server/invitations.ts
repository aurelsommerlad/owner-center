import "server-only";
import { randomBytes, createHash } from "node:crypto";
import { prisma } from "@/server/db";
import { NO_PASSWORD_SET_HASH } from "@/server/password";

/**
 * Owner-user invitation tokens: how they're generated, hashed, looked up,
 * and accepted. Only this module ever reads/writes OwnerInvitation - admin
 * Server Actions and the public /invite/[token] route both go through the
 * functions here rather than touching prisma.ownerInvitation directly, so
 * the "what counts as a valid/open invitation" rule lives in exactly one
 * place (see lookupInvitationByToken).
 *
 * The raw token is 256 bits of crypto.randomBytes entropy, base64url-
 * encoded for a URL-safe link. It is NEVER stored or logged - only its
 * SHA-256 hash goes into the database (OwnerInvitation.tokenHash); the link
 * itself is the only place the raw token exists once this module returns
 * it to its caller.
 */

export const INVITATION_TTL_DAYS = 7;
const TOKEN_BYTES = 32; // 256 bits

function generateRawToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

export interface CreatedInvitation {
  rawToken: string;
  expiresAt: Date;
}

/**
 * Revokes any still-open invitation for this user (not accepted, not
 * already revoked - regardless of whether it happens to be expired too,
 * so the audit trail is unambiguous about *why* an old row stopped being
 * usable) and issues a fresh one. Used both for a brand-new owner user and
 * for "Einladung neu erstellen" on an existing one - the two cases need no
 * different logic, since revoking zero rows is a no-op.
 */
export async function createInvitationForUser(userId: string, createdByAdminId: string): Promise<CreatedInvitation> {
  const rawToken = generateRawToken();
  const expiresAt = new Date(Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000);

  await prisma.$transaction([
    prisma.ownerInvitation.updateMany({
      where: { userId, acceptedAt: null, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
    prisma.ownerInvitation.create({
      data: {
        userId,
        tokenHash: hashToken(rawToken),
        expiresAt,
        createdByAdminId,
      },
    }),
  ]);

  return { rawToken, expiresAt };
}

export interface CreateInvitedOwnerUserInput {
  ownerId: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface CreateInvitedOwnerUserResult {
  ownerUserId: string;
  userId: string;
  rawToken: string;
  expiresAt: Date;
}

/**
 * Creates a brand-new owner-role User + OwnerUser (status "invited", no
 * usable password yet - see NO_PASSWORD_SET_HASH) under `ownerId` and
 * issues its first invitation. The one place a new owner-user login gets
 * created, whichever side triggers it: an admin adding a user to any owner
 * (src/services/admin/ownerUserService.ts#createOwnerUser) or an owner
 * inviting their own teammate (src/services/profileService.ts). `ownerId`
 * is always supplied by the caller - what actually enforces "an owner can
 * only invite into their own Owner" is that profileService.ts only ever
 * passes the acting owner's own id (resolved server-side from the session),
 * never anything from the invite form.
 *
 * `createdByUserId` is audit-only (like AdminImpersonation.adminUserId) -
 * despite OwnerInvitation.createdByAdminId's name, it holds whichever
 * User.id actually triggered the invitation, admin or owner alike.
 */
export async function createInvitedOwnerUser(
  input: CreateInvitedOwnerUserInput,
  createdByUserId: string
): Promise<CreateInvitedOwnerUserResult> {
  const email = input.email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error(`Diese E-Mail-Adresse (${email}) ist bereits vergeben.`);
  }

  const loginUser = await prisma.user.create({
    data: { email, passwordHash: NO_PASSWORD_SET_HASH, role: "owner" },
  });
  const ownerUser = await prisma.ownerUser.create({
    data: {
      ownerId: input.ownerId,
      userId: loginUser.id,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      status: "invited",
    },
  });

  const { rawToken, expiresAt } = await createInvitationForUser(loginUser.id, createdByUserId);
  return { ownerUserId: ownerUser.id, userId: loginUser.id, rawToken, expiresAt };
}

export type InvitationLookup =
  | { status: "valid"; invitationId: string; userId: string; email: string }
  | { status: "not_found" }
  | { status: "expired" }
  | { status: "revoked" }
  | { status: "accepted" };

/**
 * The single source of truth for "is this token currently usable". A token
 * is valid exactly when its row exists, is unaccepted, unrevoked, and not
 * past `expiresAt`. Looking up a token that doesn't hash-match anything in
 * the database returns the same generic "not_found" a caller gets for a
 * garbage/guessed token - no distinction is made that could let someone
 * probe for whether a given link was ever real.
 */
export async function lookupInvitationByToken(rawToken: string): Promise<InvitationLookup> {
  const tokenHash = hashToken(rawToken);
  const invitation = await prisma.ownerInvitation.findUnique({
    where: { tokenHash },
    include: { user: true },
  });
  if (!invitation) return { status: "not_found" };
  if (invitation.acceptedAt) return { status: "accepted" };
  if (invitation.revokedAt) return { status: "revoked" };
  if (invitation.expiresAt < new Date()) return { status: "expired" };
  return { status: "valid", invitationId: invitation.id, userId: invitation.userId, email: invitation.user.email };
}

export type AcceptInvitationResult =
  | { ok: true }
  | { ok: false; reason: "not_found" | "expired" | "revoked" | "accepted" };

/**
 * Accepts an invitation atomically: sets the new password hash, flips the
 * owning OwnerUser to "active", and marks the invitation accepted, all in
 * one transaction - either all three happen or none do, so a mid-way
 * failure can never leave a password set but the account still gated (or
 * vice versa). Re-validates the token's status *inside* the transaction
 * (not just trusting an earlier lookup) so two concurrent submits of the
 * same still-open link can't both succeed - Prisma serializes against the
 * unique `tokenHash` row, so the second transaction sees the first one's
 * `acceptedAt` write and is rejected as "accepted".
 */
export async function acceptInvitation(rawToken: string, newPasswordHash: string): Promise<AcceptInvitationResult> {
  const tokenHash = hashToken(rawToken);

  try {
    await prisma.$transaction(async (tx) => {
      const invitation = await tx.ownerInvitation.findUnique({
        where: { tokenHash },
        include: { user: { include: { ownerUser: true } } },
      });
      if (!invitation) throw new InvitationRejected("not_found");
      if (invitation.acceptedAt) throw new InvitationRejected("accepted");
      if (invitation.revokedAt) throw new InvitationRejected("revoked");
      if (invitation.expiresAt < new Date()) throw new InvitationRejected("expired");
      if (!invitation.user.ownerUser) throw new InvitationRejected("not_found");

      const now = new Date();
      await tx.user.update({ where: { id: invitation.userId }, data: { passwordHash: newPasswordHash } });
      await tx.ownerUser.update({ where: { id: invitation.user.ownerUser.id }, data: { status: "active" } });
      await tx.ownerInvitation.update({ where: { id: invitation.id }, data: { acceptedAt: now } });
    });
    return { ok: true };
  } catch (error) {
    if (error instanceof InvitationRejected) return { ok: false, reason: error.reason };
    throw error;
  }
}

class InvitationRejected extends Error {
  readonly reason: "not_found" | "expired" | "revoked" | "accepted";
  constructor(reason: "not_found" | "expired" | "revoked" | "accepted") {
    super(`invitation rejected: ${reason}`);
    this.reason = reason;
  }
}
