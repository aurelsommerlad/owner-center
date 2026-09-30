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

  return canOwnerAccessProperty(ownerUser.ownerId, propertyId);
}

/**
 * The pure ownerId-keyed rule underneath canUserAccessProperty - and the
 * one every Owner-Center-facing read should use directly (via
 * src/server/ownerContext.ts#getEffectiveOwnerContext), since it applies
 * identically to a real Owner login and an admin "Als Owner ansehen"
 * preview. Deliberately has no admin bypass: unlike canUserAccessProperty
 * above (an admin-side convenience for reads that are allowed to see
 * everything), this only ever reflects OwnerPropertyAccess - and, since a
 * deactivated Property must never remain reachable through an otherwise-
 * still-active access grant, the Property's own status too (matching what
 * services/propertyService.ts#getPropertiesForOwner already filters on for
 * the property switcher - this keeps the single-property lookup path
 * consistent with that list instead of silently disagreeing with it).
 */
export async function canOwnerAccessProperty(ownerId: string, propertyId: string): Promise<boolean> {
  const access = await prisma.ownerPropertyAccess.findUnique({
    where: { ownerId_propertyId: { ownerId, propertyId } },
    include: { property: { select: { status: true } } },
  });
  return access?.status === "active" && access?.property.status === "active";
}

/** Active OwnerPropertyAccess property ids for an owner company - the company-wide grant set every accounting-user check below re-verifies against, so a property revoked at the owner level immediately closes it off for every accounting login under that owner too, regardless of that login's own OwnerUserPropertyAccess rows. */
export async function getActiveOwnerPropertyIds(ownerId: string): Promise<string[]> {
  const access = await prisma.ownerPropertyAccess.findMany({
    where: { ownerId, status: "active", property: { status: "active" } },
    select: { propertyId: true },
  });
  return access.map((row) => row.propertyId);
}

/**
 * The server-side access boundary for a restricted "accounting" OwnerUser
 * (see prisma/schema.prisma#OwnerUser.role) - the accounting-role sibling of
 * canOwnerAccessProperty above. Every check re-reads OwnerUser/Owner/
 * OwnerPropertyAccess fresh (nothing cached, nothing trusted from an
 * earlier request), so revoking this OwnerUser (status -> "inactive"),
 * deactivating its Owner, or deactivating the underlying
 * OwnerPropertyAccess grant all take effect immediately, on the very next
 * request - see this file's own header comment on why that matters.
 *
 * `allProperties` is evaluated live via getActiveOwnerPropertyIds rather
 * than a snapshot, so a property the owner adds after this invitation was
 * created is picked up automatically. Otherwise, this OwnerUser's own
 * OwnerUserPropertyAccess row must ALSO be "active" - and even then, the
 * owner-company-level OwnerPropertyAccess grant for that same property must
 * still be active too (an accounting grant can never outlive or exceed the
 * owning company's own access).
 */
export async function canAccountingUserAccessProperty(ownerUserId: string, propertyId: string): Promise<boolean> {
  const ownerUser = await prisma.ownerUser.findUnique({
    where: { id: ownerUserId },
    include: { owner: true },
  });
  if (
    !ownerUser ||
    ownerUser.role !== "accounting" ||
    ownerUser.status !== "active" ||
    ownerUser.owner.status !== "active"
  ) {
    return false;
  }

  if (ownerUser.allProperties) {
    return canOwnerAccessProperty(ownerUser.ownerId, propertyId);
  }

  const grant = await prisma.ownerUserPropertyAccess.findUnique({
    where: { ownerUserId_propertyId: { ownerUserId, propertyId } },
  });
  if (!grant || grant.status !== "active") return false;

  return canOwnerAccessProperty(ownerUser.ownerId, propertyId);
}

/**
 * Property ids a restricted "accounting" OwnerUser may access - drives the
 * property switcher and the Abrechnungen year filter for that role, exactly
 * mirroring canAccountingUserAccessProperty's own rule above (never a
 * looser one) so neither list ever offers a property a direct request
 * would then be refused for.
 */
export async function getAccountingAccessiblePropertyIds(ownerUserId: string): Promise<string[]> {
  const ownerUser = await prisma.ownerUser.findUnique({
    where: { id: ownerUserId },
    include: { owner: true },
  });
  if (
    !ownerUser ||
    ownerUser.role !== "accounting" ||
    ownerUser.status !== "active" ||
    ownerUser.owner.status !== "active"
  ) {
    return [];
  }

  const ownerActiveIds = await getActiveOwnerPropertyIds(ownerUser.ownerId);
  if (ownerUser.allProperties) return ownerActiveIds;

  const grants = await prisma.ownerUserPropertyAccess.findMany({
    where: { ownerUserId, status: "active" },
    select: { propertyId: true },
  });
  const grantedIds = new Set(grants.map((grant) => grant.propertyId));
  return ownerActiveIds.filter((id) => grantedIds.has(id));
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
