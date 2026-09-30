import "server-only";
import { prisma } from "@/server/db";
import { toDateString } from "@/server/mapDate";
import { NO_PASSWORD_SET_HASH } from "@/server/password";
import { createInvitationForUser, createInvitedAccountingUser } from "@/server/invitations";
import type { AccountingAccessGrant, AccountingAccessStatus } from "@/types";
import { getDictionary, createTranslator, type Locale } from "@/i18n";

/**
 * Data-access + mutation layer for the Abrechnungen page's "Zugang für
 * Buchhaltung" section: owner-facing management of restricted "accounting"
 * OwnerUsers (see prisma/schema.prisma#OwnerUser.role) under the
 * signed-in owner. Deliberately its own file, parallel to (never imported
 * by) services/profileService.ts's "Weitere Nutzer" - the two lists are
 * kept apart everywhere, including here, so an accounting grant is never
 * accidentally exposed through the regular team-management code path.
 *
 * Every mutation here takes `ownerId` as an explicit argument rather than
 * re-deriving it - the caller (app/[propertyId]/abrechnungen/actions.ts) is
 * responsible for resolving it from the current session via
 * requireEffectiveOwnerContext() AND for rejecting any accounting-role
 * caller itself before reaching this file (see that file's own doc
 * comment) - that is what actually enforces "nur der Eigentümer selbst
 * kann Buchhaltungszugänge verwalten", not client-side hiding.
 */

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function toGrant(ownerUser: {
  id: string;
  firstName: string;
  status: string;
  allProperties: boolean;
  lastLoginAt: Date | null;
  user: { email: string; passwordHash: string; invitations: { expiresAt: Date; acceptedAt: Date | null; revokedAt: Date | null }[] };
  propertyAccess: { status: string; property: { id: string; name: string } }[];
}): Promise<AccountingAccessGrant> {
  const latestInvitation = ownerUser.user.invitations[0];
  const invitationExpiresAt =
    ownerUser.status === "invited" && latestInvitation && !latestInvitation.acceptedAt && !latestInvitation.revokedAt
      ? toDateString(latestInvitation.expiresAt)
      : undefined;
  const activeGrants = ownerUser.propertyAccess.filter((grant) => grant.status === "active");

  return {
    id: ownerUser.id,
    name: ownerUser.firstName,
    email: ownerUser.user.email,
    status: ownerUser.status as AccountingAccessStatus,
    invitationExpiresAt,
    lastLoginAt: toDateString(ownerUser.lastLoginAt) ?? undefined,
    allProperties: ownerUser.allProperties,
    propertyNames: ownerUser.allProperties ? [] : activeGrants.map((grant) => grant.property.name),
    propertyIds: ownerUser.allProperties ? [] : activeGrants.map((grant) => grant.property.id),
  };
}

export async function listAccountingAccessGrants(ownerId: string): Promise<AccountingAccessGrant[]> {
  const ownerUsers = await prisma.ownerUser.findMany({
    where: { ownerId, role: "accounting" },
    include: {
      user: { include: { invitations: { orderBy: { createdAt: "desc" }, take: 1 } } },
      propertyAccess: { include: { property: { select: { id: true, name: true } } } },
    },
    orderBy: { createdAt: "asc" },
  });
  return Promise.all(ownerUsers.map(toGrant));
}

export interface AccountingInviteResult {
  inviteToken: string;
  inviteExpiresAt: string;
}

export interface InviteAccountingAccessInput {
  email: string;
  name: string;
  allProperties: boolean;
  propertyIds: string[];
}

/**
 * "Zugang für Buchhaltung" -> Einladung erzeugen. Reuses
 * createInvitedAccountingUser (see src/server/invitations.ts), the same
 * User+OwnerUser+OwnerInvitation creation every invite in this app goes
 * through - there is only ever one invite mechanism.
 */
export async function inviteAccountingAccess(
  ownerId: string,
  invitedByUserId: string,
  input: InviteAccountingAccessInput,
  locale: Locale = "de"
): Promise<AccountingInviteResult> {
  const t = createTranslator(getDictionary(locale));
  const email = input.email.trim();
  if (!isValidEmail(email)) {
    throw new Error(t("profile.invalidEmail"));
  }
  if (!input.allProperties && input.propertyIds.length === 0) {
    throw new Error(t("accountingAccess.selectAtLeastOneProperty"));
  }

  const { rawToken, expiresAt } = await createInvitedAccountingUser(
    { ownerId, email, name: input.name, allProperties: input.allProperties, propertyIds: input.propertyIds },
    invitedByUserId
  );
  return { inviteToken: rawToken, inviteExpiresAt: expiresAt.toISOString() };
}

/**
 * "Einladung neu erstellen" for an accounting grant. `ownerId` is checked
 * against the target OwnerUser's actual ownerId AND its role must actually
 * be "accounting" - before touching anything, so this can never be used to
 * recreate an invitation for a regular teammate (that stays
 * profileService.ts#recreateOwnTeamInvitation's job) or a user outside the
 * caller's own team, even by guessing/tampering with an ownerUserId.
 */
export async function recreateAccountingInvitation(
  ownerId: string,
  ownerUserId: string,
  requestedByUserId: string,
  locale: Locale = "de"
): Promise<AccountingInviteResult> {
  const t = createTranslator(getDictionary(locale));
  const ownerUser = await prisma.ownerUser.findUnique({ where: { id: ownerUserId } });
  if (!ownerUser || ownerUser.ownerId !== ownerId || ownerUser.role !== "accounting") {
    throw new Error(t("accountingAccess.grantNotFound"));
  }

  const { rawToken, expiresAt } = await createInvitationForUser(ownerUser.userId, requestedByUserId);
  await prisma.ownerUser.update({ where: { id: ownerUserId }, data: { status: "invited" } });
  return { inviteToken: rawToken, inviteExpiresAt: expiresAt.toISOString() };
}

export interface SetAccountingAccessStatusResult {
  name: string;
}

/**
 * "Zugang entziehen" / "Zugang reaktivieren". Setting status "inactive" is
 * the actual, immediate revocation - server/permissions.ts#
 * canAccountingUserAccessProperty re-reads this OwnerUser's status on
 * every single request (nothing cached), so a revoked grant stops working
 * on the very next request, including an in-flight download link. Re-checks
 * ownership and role inside the same query as setOwnTeamUserStatus's own
 * pattern - never trusts an earlier read.
 */
export async function setAccountingAccessStatus(
  ownerId: string,
  ownerUserId: string,
  status: "active" | "inactive",
  locale: Locale = "de"
): Promise<SetAccountingAccessStatusResult> {
  const t = createTranslator(getDictionary(locale));
  const ownerUser = await prisma.ownerUser.findUnique({ where: { id: ownerUserId }, include: { user: true } });
  if (!ownerUser || ownerUser.ownerId !== ownerId || ownerUser.role !== "accounting") {
    throw new Error(t("accountingAccess.grantNotFound"));
  }
  if (status === "active" && ownerUser.user.passwordHash === NO_PASSWORD_SET_HASH) {
    throw new Error(t("profile.passwordNotSetYet"));
  }

  await prisma.ownerUser.update({ where: { id: ownerUserId }, data: { status } });
  return { name: ownerUser.firstName || ownerUser.user.email };
}

export interface UpdateAccountingAccessPropertiesInput {
  allProperties: boolean;
  propertyIds: string[];
}

/**
 * "Berechtigung bearbeiten" - replaces an accounting grant's property scope.
 * `propertyIds` is intersected against `ownerId`'s own active
 * OwnerPropertyAccess grants (never trusted verbatim, same rule as
 * createInvitedAccountingUser). Old OwnerUserPropertyAccess rows are set
 * "inactive" (never deleted, matching OwnerPropertyAccess's own audit-trail
 * pattern) and replaced with fresh "active" rows for the new selection -
 * done inside one transaction so a caller can never observe a half-updated
 * grant.
 */
export async function updateAccountingAccessProperties(
  ownerId: string,
  ownerUserId: string,
  input: UpdateAccountingAccessPropertiesInput,
  locale: Locale = "de"
): Promise<void> {
  const t = createTranslator(getDictionary(locale));
  const ownerUser = await prisma.ownerUser.findUnique({ where: { id: ownerUserId } });
  if (!ownerUser || ownerUser.ownerId !== ownerId || ownerUser.role !== "accounting") {
    throw new Error(t("accountingAccess.grantNotFound"));
  }
  if (!input.allProperties && input.propertyIds.length === 0) {
    throw new Error(t("accountingAccess.selectAtLeastOneProperty"));
  }

  let ownedPropertyIds: string[] = [];
  if (!input.allProperties) {
    const access = await prisma.ownerPropertyAccess.findMany({
      where: { ownerId, status: "active", propertyId: { in: input.propertyIds } },
      select: { propertyId: true },
    });
    ownedPropertyIds = access.map((row) => row.propertyId);
    if (ownedPropertyIds.length === 0) {
      throw new Error(t("accountingAccess.selectAtLeastOneProperty"));
    }
  }

  await prisma.$transaction([
    prisma.ownerUser.update({ where: { id: ownerUserId }, data: { allProperties: input.allProperties } }),
    prisma.ownerUserPropertyAccess.updateMany({
      where: { ownerUserId, status: "active" },
      data: { status: "inactive" },
    }),
    ...(input.allProperties
      ? []
      : [
          prisma.ownerUserPropertyAccess.createMany({
            data: ownedPropertyIds.map((propertyId) => ({ ownerUserId, propertyId, status: "active" })),
            skipDuplicates: true,
          }),
        ]),
  ]);

  // A property that already had an "inactive" row from an earlier edit
  // (deselected, then reselected later) needs reactivating too -
  // createMany's skipDuplicates above silently drops it instead of
  // updating it, so re-activate any such rows explicitly.
  if (!input.allProperties && ownedPropertyIds.length > 0) {
    await prisma.ownerUserPropertyAccess.updateMany({
      where: { ownerUserId, propertyId: { in: ownedPropertyIds } },
      data: { status: "active" },
    });
  }
}
