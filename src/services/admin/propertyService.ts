import type { AdminOwner, AdminProperty, AdminPropertyStatus } from "@/types/admin";
import { prisma } from "@/server/db";
import { getOwnersForProperty as getOwnersForPropertyPermission, toAdminProperty } from "@/lib/adminPermissions";

/**
 * Reads and writes against the real `Property` table. Only identity/config
 * fields live here - reservations, guests, occupancy, units, pricing and
 * availability are never modeled in this service; those stay apaleo's
 * domain once that integration exists.
 */

export async function getProperties(): Promise<AdminProperty[]> {
  const properties = await prisma.property.findMany({ orderBy: { createdAt: "desc" } });
  return properties.map(toAdminProperty);
}

export async function getProperty(id: string): Promise<AdminProperty | undefined> {
  const property = await prisma.property.findUnique({ where: { id } });
  return property ? toAdminProperty(property) : undefined;
}

/** Owners with active access to this property, via OwnerPropertyAccess (many-to-many). */
export async function getOwnersForProperty(propertyId: string): Promise<AdminOwner[]> {
  return getOwnersForPropertyPermission(propertyId);
}

export interface PropertyInput {
  name: string;
  /** Admin's single "Standort" field - stored as Property.city. */
  location: string;
  status?: AdminPropertyStatus;
  /** The leading, admin-entered apaleo property id - see setApaleoPropertyMappingAction, the only caller that ever sets this via the "apaleo-Verknüpfung" card. */
  apaleoPropertyId?: string;
  /** The real Google Drive folder mapping - see setGoogleDriveFolderMappingAction, the only caller that ever sets this. */
  googleDriveFolderId?: string;
}

export async function createProperty(input: PropertyInput): Promise<AdminProperty> {
  const property = await prisma.property.create({
    data: {
      name: input.name,
      city: input.location,
      status: input.status ?? "active",
      apaleoPropertyId: input.apaleoPropertyId || undefined,
      googleDriveFolderId: input.googleDriveFolderId || undefined,
    },
  });
  return toAdminProperty(property);
}

export async function updateProperty(id: string, input: Partial<PropertyInput>): Promise<AdminProperty | undefined> {
  const property = await prisma.property
    .update({
      where: { id },
      data: {
        name: input.name,
        city: input.location,
        status: input.status,
        apaleoPropertyId: input.apaleoPropertyId === undefined ? undefined : input.apaleoPropertyId || null,
        googleDriveFolderId:
          input.googleDriveFolderId === undefined ? undefined : input.googleDriveFolderId || null,
      },
    })
    .catch(() => null);
  return property ? toAdminProperty(property) : undefined;
}

export async function setPropertyStatus(id: string, status: AdminPropertyStatus): Promise<AdminProperty | undefined> {
  return updateProperty(id, { status });
}
