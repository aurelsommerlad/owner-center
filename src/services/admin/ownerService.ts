import type { AccountStatus, AdminOwner, OwnerDependencySummary } from "@/types/admin";
import { prisma } from "@/server/db";
import {
  getPropertiesForOwner as getPropertiesForOwnerPermission,
  getUsersForOwner,
  toAdminOwner,
} from "@/lib/adminPermissions";
import type { AdminProperty } from "@/types/admin";

/**
 * Reads and writes against the real `Owner` table. This is the seam a
 * mock-array version of this file used to fill: every function here keeps
 * its signature, only the body changed from "array find/push" to a real
 * Prisma query/insert.
 */

export interface OwnerFilters {
  /** Matched against name, companyName, and any of the owner's users' emails. */
  search?: string;
  status?: AccountStatus;
}

export async function getOwners(filters: OwnerFilters = {}): Promise<AdminOwner[]> {
  const owners = await prisma.owner.findMany({
    where: filters.status ? { status: filters.status } : undefined,
    orderBy: { createdAt: "desc" },
  });

  const search = filters.search?.trim().toLowerCase();
  if (!search) return owners.map(toAdminOwner);

  const results: AdminOwner[] = [];
  for (const owner of owners) {
    const emails = (await getUsersForOwner(owner.id)).map((user) => user.email);
    const haystack = [owner.name, owner.companyName ?? "", ...emails].join(" ").toLowerCase();
    if (haystack.includes(search)) results.push(toAdminOwner(owner));
  }
  return results;
}

export async function getOwner(id: string): Promise<AdminOwner | undefined> {
  const owner = await prisma.owner.findUnique({ where: { id } });
  return owner ? toAdminOwner(owner) : undefined;
}

/** Properties this owner has active access to, via OwnerPropertyAccess (many-to-many). */
export async function getPropertiesForOwner(ownerId: string): Promise<AdminProperty[]> {
  return getPropertiesForOwnerPermission(ownerId);
}

export interface CreateOwnerInput {
  name: string;
  companyName?: string;
  status?: AccountStatus;
}

export async function createOwner(input: CreateOwnerInput): Promise<AdminOwner> {
  const owner = await prisma.owner.create({
    data: {
      name: input.name,
      companyName: input.companyName,
      status: input.status ?? "active",
    },
  });
  return toAdminOwner(owner);
}

export interface UpdateOwnerInput {
  name?: string;
  companyName?: string;
  status?: AccountStatus;
}

export async function updateOwner(id: string, input: UpdateOwnerInput): Promise<AdminOwner | undefined> {
  const owner = await prisma.owner
    .update({
      where: { id },
      data: {
        name: input.name,
        companyName: input.companyName === undefined ? undefined : input.companyName || null,
        status: input.status,
      },
    })
    .catch(() => null);
  return owner ? toAdminOwner(owner) : undefined;
}

export async function setOwnerStatus(id: string, status: AccountStatus): Promise<AdminOwner | undefined> {
  return updateOwner(id, { status });
}

/**
 * Every dependent row that has to be zero before deleteOwnerPermanently is
 * allowed to run. `propertyAccessCount` deliberately only counts ACTIVE
 * OwnerPropertyAccess rows - a revoked/"inactive" one does NOT block: an
 * earlier version counted every row regardless of status on the theory
 * that a revoked row is still a "historical record a hard delete must not
 * silently destroy", but that protected nothing in practice, since
 * OwnerPropertyAccess.owner is `onDelete: Cascade` (see
 * prisma/schema.prisma) - deleting the Owner removes that row anyway,
 * blocked or not. All it did was create a permanent dead end: revoke an
 * owner's access to a property, and the owner could then never be deleted
 * at all, with no UI anywhere to remove the now-inactive row either. A
 * *currently* active access row still blocks (deleting an owner who has
 * live access to a property today should not happen silently).
 *
 * OwnerInvitation is deliberately not counted separately here - an
 * invitation only ever exists for a User that has an OwnerUser under this
 * owner (see createOwnerUser/createInvitationForUser), so a zero
 * ownerUserCount already implies zero invitations for this owner.
 */
export async function getOwnerDependencySummary(id: string): Promise<OwnerDependencySummary> {
  const [ownerUserCount, propertyAccessCount, statementDocumentCount, generalDocumentCount] = await Promise.all([
    prisma.ownerUser.count({ where: { ownerId: id } }),
    prisma.ownerPropertyAccess.count({ where: { ownerId: id, status: "active" } }),
    prisma.statementDocument.count({ where: { ownerId: id } }),
    prisma.generalDocument.count({ where: { ownerId: id } }),
  ]);
  return { ownerUserCount, propertyAccessCount, statementDocumentCount, generalDocumentCount };
}

function hasBlockingDependencies(summary: OwnerDependencySummary): boolean {
  return (
    summary.ownerUserCount > 0 ||
    summary.propertyAccessCount > 0 ||
    summary.statementDocumentCount > 0 ||
    summary.generalDocumentCount > 0
  );
}

export const OWNER_DELETE_BLOCKED_MESSAGE =
  "Dieser Eigentümer kann nicht endgültig gelöscht werden, solange noch Benutzer, Objekte oder Dokumente zugeordnet sind. Bitte entfernen Sie zuerst die entsprechenden Zuordnungen oder deaktivieren Sie den Eigentümer.";

export interface DeleteOwnerResult {
  ok: boolean;
  message: string;
}

/**
 * "Eigentümer endgültig löschen" - only ever removes the Owner row itself
 * (plus its own AdminImpersonation preview history, which belongs to no one
 * else) once a fresh, in-transaction re-check confirms zero OwnerUser,
 * OwnerPropertyAccess, StatementDocument and GeneralDocument rows still
 * reference it - closing the TOCTOU window between an earlier
 * getOwnerDependencySummary() read and this call. Never touches the `User`
 * table: by construction there is no OwnerUser (and therefore no User) left
 * to consider once this point is reached.
 */
export async function deleteOwnerPermanently(id: string): Promise<DeleteOwnerResult> {
  return prisma.$transaction(async (tx) => {
    const owner = await tx.owner.findUnique({ where: { id } });
    if (!owner) return { ok: false, message: "Eigentümer wurde nicht gefunden." };

    const [ownerUserCount, propertyAccessCount, statementDocumentCount, generalDocumentCount] = await Promise.all([
      tx.ownerUser.count({ where: { ownerId: id } }),
      tx.ownerPropertyAccess.count({ where: { ownerId: id, status: "active" } }),
      tx.statementDocument.count({ where: { ownerId: id } }),
      tx.generalDocument.count({ where: { ownerId: id } }),
    ]);
    if (hasBlockingDependencies({ ownerUserCount, propertyAccessCount, statementDocumentCount, generalDocumentCount })) {
      return { ok: false, message: OWNER_DELETE_BLOCKED_MESSAGE };
    }

    await tx.adminImpersonation.deleteMany({ where: { ownerId: id } });
    await tx.owner.delete({ where: { id } });
    return { ok: true, message: `${owner.name} wurde endgültig gelöscht.` };
  });
}
