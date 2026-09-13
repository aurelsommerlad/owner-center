import type { OwnerPropertyAccess } from "@/types/admin";
import { prisma } from "@/server/db";
import { toDateString } from "@/server/mapDate";

/**
 * Reads and writes against the real `OwnerPropertyAccess` table. Access is
 * never deleted, only soft-revoked (status flips to "inactive"), so there
 * is always a record of who was ever granted access to what.
 */

function toAccess(row: {
  id: string;
  ownerId: string;
  propertyId: string;
  status: string;
  createdAt: Date;
}): OwnerPropertyAccess {
  return {
    id: row.id,
    ownerId: row.ownerId,
    propertyId: row.propertyId,
    status: row.status as OwnerPropertyAccess["status"],
    createdAt: toDateString(row.createdAt),
  };
}

export async function grantAccess(ownerId: string, propertyId: string): Promise<OwnerPropertyAccess> {
  const access = await prisma.ownerPropertyAccess.upsert({
    where: { ownerId_propertyId: { ownerId, propertyId } },
    update: { status: "active" },
    create: { ownerId, propertyId, status: "active" },
  });
  return toAccess(access);
}

export async function revokeAccess(ownerId: string, propertyId: string): Promise<void> {
  await prisma.ownerPropertyAccess
    .update({
      where: { ownerId_propertyId: { ownerId, propertyId } },
      data: { status: "inactive" },
    })
    .catch(() => null);
}

/**
 * Replaces an owner's full set of active property access in one call -
 * used by the "Objektzugriff bearbeiten" editor, which submits the
 * complete desired selection rather than one grant/revoke at a time.
 */
export async function setOwnerPropertyAccess(ownerId: string, propertyIds: string[]): Promise<void> {
  const desired = new Set(propertyIds);
  await prisma.ownerPropertyAccess.updateMany({
    where: { ownerId, status: "active", propertyId: { notIn: Array.from(desired) } },
    data: { status: "inactive" },
  });
  for (const propertyId of desired) {
    await grantAccess(ownerId, propertyId);
  }
}

/** Same as setOwnerPropertyAccess, from the property side - used by the property create/edit form's owner picker. */
export async function setPropertyOwnerAccess(propertyId: string, ownerIds: string[]): Promise<void> {
  const desired = new Set(ownerIds);
  await prisma.ownerPropertyAccess.updateMany({
    where: { propertyId, status: "active", ownerId: { notIn: Array.from(desired) } },
    data: { status: "inactive" },
  });
  for (const ownerId of desired) {
    await grantAccess(ownerId, propertyId);
  }
}
