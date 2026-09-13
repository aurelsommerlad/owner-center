import type { AdminOwner, AdminProperty } from "@/types/admin";
import { adminOwners, adminProperties, ownerPropertyAccess } from "@/data/admin";

export async function getProperties(): Promise<AdminProperty[]> {
  return adminProperties;
}

export async function getProperty(id: string): Promise<AdminProperty | undefined> {
  return adminProperties.find((property) => property.id === id);
}

/** Owners with access to this property, via OwnerPropertyAccess (many-to-many). */
export async function getOwnersForProperty(propertyId: string): Promise<AdminOwner[]> {
  const ownerIds = new Set(
    ownerPropertyAccess.filter((access) => access.propertyId === propertyId).map((access) => access.ownerId)
  );
  return adminOwners.filter((owner) => ownerIds.has(owner.id));
}
