import { randomUUID } from "crypto";
import type { AdminOwner, AdminProperty, AdminPropertyStatus } from "@/types/admin";
import { adminProperties } from "@/data/admin";
import { getOwnersForProperty as getOwnersForPropertyPermission } from "@/lib/adminPermissions";

/**
 * Reads and writes against the central `adminProperties` mock array. Only
 * identity/config fields live here - reservations, guests, occupancy,
 * units, pricing and availability are never modeled in this service; those
 * stay apaleo's domain once that integration exists.
 */

export async function getProperties(): Promise<AdminProperty[]> {
  return adminProperties;
}

export async function getProperty(id: string): Promise<AdminProperty | undefined> {
  return adminProperties.find((property) => property.id === id);
}

/** Owners with active access to this property, via OwnerPropertyAccess (many-to-many). */
export async function getOwnersForProperty(propertyId: string): Promise<AdminOwner[]> {
  return getOwnersForPropertyPermission(propertyId);
}

export interface PropertyInput {
  name: string;
  location: string;
  status?: AdminPropertyStatus;
  /** Mock configuration only - never a real apaleo connection. */
  apaleoPropertyId?: string;
  /** Mock configuration only - never a real Drive connection. */
  statementsDriveFolderId?: string;
  /** Mock configuration only - never a real Drive connection. */
  documentsDriveFolderId?: string;
}

export async function createProperty(input: PropertyInput): Promise<AdminProperty> {
  const now = new Date().toISOString().slice(0, 10);
  const property: AdminProperty = {
    id: `admin-property-${randomUUID()}`,
    name: input.name,
    location: input.location,
    status: input.status ?? "active",
    apaleoPropertyId: input.apaleoPropertyId || undefined,
    statementsDriveFolderId: input.statementsDriveFolderId || undefined,
    documentsDriveFolderId: input.documentsDriveFolderId || undefined,
    createdAt: now,
    updatedAt: now,
  };
  adminProperties.push(property);
  return property;
}

export async function updateProperty(id: string, input: Partial<PropertyInput>): Promise<AdminProperty | undefined> {
  const property = adminProperties.find((candidate) => candidate.id === id);
  if (!property) return undefined;
  if (input.name !== undefined) property.name = input.name;
  if (input.location !== undefined) property.location = input.location;
  if (input.status !== undefined) property.status = input.status;
  if (input.apaleoPropertyId !== undefined) property.apaleoPropertyId = input.apaleoPropertyId || undefined;
  if (input.statementsDriveFolderId !== undefined) {
    property.statementsDriveFolderId = input.statementsDriveFolderId || undefined;
  }
  if (input.documentsDriveFolderId !== undefined) {
    property.documentsDriveFolderId = input.documentsDriveFolderId || undefined;
  }
  property.updatedAt = new Date().toISOString().slice(0, 10);
  return property;
}

export async function setPropertyStatus(id: string, status: AdminPropertyStatus): Promise<AdminProperty | undefined> {
  return updateProperty(id, { status });
}
