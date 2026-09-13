import "server-only";
import { prisma } from "./db";
import type { SessionData } from "./session";

/**
 * The real, server-side access boundary for property-scoped data. Every
 * property-scoped page/query in the Owner Center goes through this (see
 * services/propertyService.ts#getProperty) - never through hidden
 * navigation, client state, or a hidden URL. An owner can never see another
 * owner's data by editing the URL: this check runs on the server for every
 * request, independent of what the client sent or knows.
 *
 * Admins bypass the owner/property link entirely ("Zugriff auf alle
 * Owner/Properties"). An owner-role session additionally needs its Owner
 * and OwnerUser rows to still be "active" - deactivating either in admin
 * revokes access immediately, even for an already-open session.
 */
export async function canUserAccessProperty(
  session: Pick<SessionData, "role" | "ownerId" | "ownerStatus" | "ownerUserStatus">,
  propertyId: string
): Promise<boolean> {
  if (session.role === "admin") return true;
  if (!session.ownerId || session.ownerStatus !== "active" || session.ownerUserStatus !== "active") {
    return false;
  }

  const access = await prisma.ownerPropertyAccess.findUnique({
    where: { ownerId_propertyId: { ownerId: session.ownerId, propertyId } },
  });
  return access?.status === "active";
}

/** Property ids this session may access - admin gets every property, an owner gets their active grants. */
export async function getAccessiblePropertyIds(
  session: Pick<SessionData, "role" | "ownerId" | "ownerStatus" | "ownerUserStatus">
): Promise<string[]> {
  if (session.role === "admin") {
    const properties = await prisma.property.findMany({ select: { id: true } });
    return properties.map((property) => property.id);
  }
  if (!session.ownerId || session.ownerStatus !== "active" || session.ownerUserStatus !== "active") {
    return [];
  }
  const access = await prisma.ownerPropertyAccess.findMany({
    where: { ownerId: session.ownerId, status: "active" },
    select: { propertyId: true },
  });
  return access.map((row) => row.propertyId);
}
