import { randomUUID } from "crypto";
import type { OwnerPropertyAccess } from "@/types/admin";
import { ownerPropertyAccess } from "@/data/admin";

/**
 * Reads and writes against the central `ownerPropertyAccess` mock array.
 * Access is never deleted, only soft-revoked (status flips to "inactive"),
 * so there is always a record of who was ever granted access to what.
 */

export async function grantAccess(ownerId: string, propertyId: string): Promise<OwnerPropertyAccess> {
  const existing = ownerPropertyAccess.find((access) => access.ownerId === ownerId && access.propertyId === propertyId);
  if (existing) {
    existing.status = "active";
    return existing;
  }
  const access: OwnerPropertyAccess = {
    id: `access-${randomUUID()}`,
    ownerId,
    propertyId,
    status: "active",
    createdAt: new Date().toISOString().slice(0, 10),
  };
  ownerPropertyAccess.push(access);
  return access;
}

export async function revokeAccess(ownerId: string, propertyId: string): Promise<void> {
  const existing = ownerPropertyAccess.find((access) => access.ownerId === ownerId && access.propertyId === propertyId);
  if (existing) existing.status = "inactive";
}

/**
 * Replaces an owner's full set of active property access in one call -
 * used by the "Objektzugriff bearbeiten" editor, which submits the
 * complete desired selection rather than one grant/revoke at a time.
 */
export async function setOwnerPropertyAccess(ownerId: string, propertyIds: string[]): Promise<void> {
  const desired = new Set(propertyIds);
  for (const access of ownerPropertyAccess) {
    if (access.ownerId === ownerId && access.status === "active" && !desired.has(access.propertyId)) {
      access.status = "inactive";
    }
  }
  for (const propertyId of desired) {
    await grantAccess(ownerId, propertyId);
  }
}

/** Same as setOwnerPropertyAccess, from the property side - used by the property create/edit form's owner picker. */
export async function setPropertyOwnerAccess(propertyId: string, ownerIds: string[]): Promise<void> {
  const desired = new Set(ownerIds);
  for (const access of ownerPropertyAccess) {
    if (access.propertyId === propertyId && access.status === "active" && !desired.has(access.ownerId)) {
      access.status = "inactive";
    }
  }
  for (const ownerId of desired) {
    await grantAccess(ownerId, propertyId);
  }
}
