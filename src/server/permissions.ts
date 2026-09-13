import "server-only";
import { prisma } from "./db";

/**
 * THE central, server-side access boundary for property-scoped data -
 * exactly the shape asked for: a self-contained (userId, propertyId) check
 * that does its own lookup rather than depending on a pre-fetched session
 * object, so it can be called from anywhere a userId is known. Every
 * property-scoped query in the Owner Center goes through this (see
 * services/propertyService.ts#getProperty) - never through hidden
 * navigation, client state, or a hidden URL. An owner can never see another
 * owner's data by editing the URL: this runs on the server for every
 * request, independent of what the client sent or knows.
 *
 * Admins bypass the owner/property link entirely ("Zugriff auf alle
 * Owner/Properties"). An owner-role user additionally needs its Owner and
 * OwnerUser rows to still be "active" - deactivating either in admin
 * revokes access immediately, even for an already-open session.
 */
export async function canUserAccessProperty(userId: string, propertyId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { ownerUser: { include: { owner: true } } },
  });
  if (!user) return false;
  if (user.role === "admin") return true;

  const ownerUser = user.ownerUser;
  if (!ownerUser || ownerUser.status !== "active" || ownerUser.owner.status !== "active") {
    return false;
  }

  const access = await prisma.ownerPropertyAccess.findUnique({
    where: { ownerId_propertyId: { ownerId: ownerUser.ownerId, propertyId } },
  });
  return access?.status === "active";
}

/** Property ids this user may access - admin gets every property, an owner gets their active grants. */
export async function getAccessiblePropertyIds(userId: string): Promise<string[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { ownerUser: { include: { owner: true } } },
  });
  if (!user) return [];
  if (user.role === "admin") {
    const properties = await prisma.property.findMany({ select: { id: true } });
    return properties.map((property) => property.id);
  }

  const ownerUser = user.ownerUser;
  if (!ownerUser || ownerUser.status !== "active" || ownerUser.owner.status !== "active") {
    return [];
  }

  const access = await prisma.ownerPropertyAccess.findMany({
    where: { ownerId: ownerUser.ownerId, status: "active" },
    select: { propertyId: true },
  });
  return access.map((row) => row.propertyId);
}
