import "server-only";
import type { AdminOwner, AdminOwnerUser, AdminProperty } from "@/types/admin";
import { prisma } from "@/server/db";
import { toDateString } from "@/server/mapDate";
import type {
  Owner as DbOwner,
  OwnerUser as DbOwnerUser,
  Property as DbProperty,
  User as DbUser,
} from "@/generated/prisma/client";

/**
 * Central query helpers for the admin Owner<->User<->Property relationships,
 * backed by the real database (OwnerPropertyAccess, OwnerUser). Every admin
 * service (ownerService, propertyService, ownerUserService, dashboardService)
 * goes through these rather than querying Prisma ad hoc, so this logic isn't
 * scattered across the codebase.
 *
 * `canOwnerAccessProperty` here is an internal admin bookkeeping query
 * (ownerId -scoped, used by admin screens) - it is distinct from
 * src/server/permissions.ts#canUserAccessProperty, which is the real,
 * session-based security gate the Owner Center's data-fetching goes
 * through. Do not use this one to guard a request.
 */

export function toAdminOwner(owner: DbOwner): AdminOwner {
  return {
    id: owner.id,
    name: owner.name,
    companyName: owner.companyName ?? undefined,
    status: owner.status as AdminOwner["status"],
    createdAt: toDateString(owner.createdAt),
    updatedAt: toDateString(owner.updatedAt),
  };
}

export function toAdminProperty(property: DbProperty): AdminProperty {
  return {
    id: property.id,
    name: property.name,
    location: property.city,
    status: property.status as AdminProperty["status"],
    apaleoPropertyId: property.apaleoPropertyId ?? undefined,
    statementsDriveFolderId: property.statementsDriveFolderId ?? undefined,
    documentsDriveFolderId: property.documentsDriveFolderId ?? undefined,
    createdAt: toDateString(property.createdAt),
    updatedAt: toDateString(property.updatedAt),
  };
}

export function toAdminOwnerUser(ownerUser: DbOwnerUser & { user: DbUser }): AdminOwnerUser {
  return {
    id: ownerUser.id,
    ownerId: ownerUser.ownerId,
    firstName: ownerUser.firstName,
    lastName: ownerUser.lastName,
    email: ownerUser.user.email,
    status: ownerUser.status as AdminOwnerUser["status"],
    role: "owner",
    lastLoginAt: toDateString(ownerUser.lastLoginAt) ?? undefined,
    createdAt: toDateString(ownerUser.createdAt),
    updatedAt: toDateString(ownerUser.updatedAt),
  };
}

/** Properties this owner has active access to, via OwnerPropertyAccess (many-to-many). */
export async function getPropertiesForOwner(ownerId: string): Promise<AdminProperty[]> {
  const access = await prisma.ownerPropertyAccess.findMany({
    where: { ownerId, status: "active" },
    include: { property: true },
    orderBy: { createdAt: "asc" },
  });
  return access.map((row) => toAdminProperty(row.property));
}

/** Owners with active access to this property, via OwnerPropertyAccess (many-to-many). */
export async function getOwnersForProperty(propertyId: string): Promise<AdminOwner[]> {
  const access = await prisma.ownerPropertyAccess.findMany({
    where: { propertyId, status: "active" },
    include: { owner: true },
    orderBy: { createdAt: "asc" },
  });
  return access.map((row) => toAdminOwner(row.owner));
}

export async function getUsersForOwner(ownerId: string): Promise<AdminOwnerUser[]> {
  const users = await prisma.ownerUser.findMany({
    where: { ownerId },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });
  return users.map(toAdminOwnerUser);
}

export async function canOwnerAccessProperty(ownerId: string, propertyId: string): Promise<boolean> {
  const access = await prisma.ownerPropertyAccess.findUnique({
    where: { ownerId_propertyId: { ownerId, propertyId } },
  });
  return access?.status === "active";
}
