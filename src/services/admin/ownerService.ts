import type { AdminOwner, AdminOwnerUser, AdminProperty } from "@/types/admin";
import { adminOwners, adminOwnerUsers, adminProperties, ownerPropertyAccess } from "@/data/admin";

export async function getOwners(): Promise<AdminOwner[]> {
  return adminOwners;
}

export async function getOwner(id: string): Promise<AdminOwner | undefined> {
  return adminOwners.find((owner) => owner.id === id);
}

export async function getOwnerUsers(ownerId: string): Promise<AdminOwnerUser[]> {
  return adminOwnerUsers.filter((user) => user.ownerId === ownerId);
}

/** Properties this owner has access to, via OwnerPropertyAccess (many-to-many). */
export async function getPropertiesForOwner(ownerId: string): Promise<AdminProperty[]> {
  const propertyIds = new Set(
    ownerPropertyAccess.filter((access) => access.ownerId === ownerId).map((access) => access.propertyId)
  );
  return adminProperties.filter((property) => propertyIds.has(property.id));
}
