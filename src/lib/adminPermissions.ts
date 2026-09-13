import type { AdminOwner, AdminOwnerUser, AdminProperty } from "@/types/admin";
import { adminOwners, adminOwnerUsers, adminProperties, ownerPropertyAccess } from "@/data/admin";

/**
 * Central owner ↔ property ↔ user permission/query logic - the single
 * place this relationship is ever traversed from. Every admin service and
 * (later) the Owner Center's own data-fetching should call these functions
 * rather than re-deriving the same joins locally, so there is exactly one
 * place to change when persistence moves to a real database.
 *
 * Not a security boundary: this is mock, in-memory, unauthenticated logic.
 * Once real auth + a database exist, the equivalent checks (in particular
 * canOwnerAccessProperty) MUST be re-implemented server-side against
 * trusted session data - never trust a client-supplied ownerId.
 */

/** Properties this owner currently has active access to. */
export function getPropertiesForOwner(ownerId: string): AdminProperty[] {
  const propertyIds = new Set(
    ownerPropertyAccess
      .filter((access) => access.ownerId === ownerId && access.status === "active")
      .map((access) => access.propertyId)
  );
  return adminProperties.filter((property) => propertyIds.has(property.id));
}

/** All login users belonging to this owner (regardless of their own status). */
export function getUsersForOwner(ownerId: string): AdminOwnerUser[] {
  return adminOwnerUsers.filter((user) => user.ownerId === ownerId);
}

/** Owners currently holding active access to this property. */
export function getOwnersForProperty(propertyId: string): AdminOwner[] {
  const ownerIds = new Set(
    ownerPropertyAccess
      .filter((access) => access.propertyId === propertyId && access.status === "active")
      .map((access) => access.ownerId)
  );
  return adminOwners.filter((owner) => ownerIds.has(owner.id));
}

/** Whether this owner currently has active access to this property. */
export function canOwnerAccessProperty(ownerId: string, propertyId: string): boolean {
  return ownerPropertyAccess.some(
    (access) => access.ownerId === ownerId && access.propertyId === propertyId && access.status === "active"
  );
}
