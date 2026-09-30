import type { Property } from "@/types";
import { prisma } from "@/server/db";
import { canAccountingUserAccessProperty, canOwnerAccessProperty, getActiveOwnerPropertyIds } from "@/server/permissions";
import { requireEffectiveOwnerContext, type EffectiveOwnerContext } from "@/server/ownerContext";
import type { Property as DbProperty } from "@/generated/prisma/client";

/**
 * `Property.ownerId` predates OwnerPropertyAccess (properties can now have
 * several owners) and is read by no component - kept only for backward type
 * compatibility. Filled in with the requesting owner's id where known,
 * since that is the closest still-meaningful value; never treat it as the
 * authoritative owner of a property (query OwnerPropertyAccess for that).
 */
function toProperty(property: DbProperty, viewerOwnerId: string): Property {
  return {
    id: property.id,
    ownerId: viewerOwnerId,
    name: property.name,
    location: { city: property.city, region: property.region ?? property.city },
    imageSeed: property.id,
  };
}

export async function getPropertiesForOwner(ownerId: string): Promise<Property[]> {
  const access = await prisma.ownerPropertyAccess.findMany({
    where: { ownerId, status: "active", property: { status: "active" } },
    include: { property: true },
    orderBy: { createdAt: "asc" },
  });
  return access.map((row) => toProperty(row.property, ownerId));
}

/**
 * The property switcher's list for a restricted "accounting" OwnerUser -
 * exactly the properties canAccountingUserAccessProperty would allow for
 * this ownerUserId, never a wider set (see that function's own doc comment
 * for why the owner-company-level OwnerPropertyAccess grant is re-verified
 * here too, not just this OwnerUser's own OwnerUserPropertyAccess rows).
 */
export async function getPropertiesForAccountingUser(ownerUserId: string): Promise<Property[]> {
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

  if (ownerUser.allProperties) {
    return getPropertiesForOwner(ownerUser.ownerId);
  }

  const [ownerActiveIds, grants] = await Promise.all([
    getActiveOwnerPropertyIds(ownerUser.ownerId),
    prisma.ownerUserPropertyAccess.findMany({
      where: { ownerUserId, status: "active" },
      include: { property: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  const ownerActiveIdSet = new Set(ownerActiveIds);
  return grants
    .filter((grant) => ownerActiveIdSet.has(grant.propertyId) && grant.property.status === "active")
    .map((grant) => toProperty(grant.property, ownerUser.ownerId));
}

/**
 * The one place [propertyId]/layout.tsx (and app/page.tsx's root redirect)
 * resolves "which properties may this effective session switch between" -
 * branches on ownerUserRole so an accounting login only ever sees its own
 * granted subset, never the owner company's full property list.
 */
export async function getPropertiesForEffectiveContext(context: EffectiveOwnerContext): Promise<Property[]> {
  if (context.ownerUserRole === "accounting" && context.ownerUserId) {
    return getPropertiesForAccountingUser(context.ownerUserId);
  }
  return getPropertiesForOwner(context.ownerId);
}

/**
 * The real server-side access gate for property-scoped pages: every page
 * under /[propertyId] calls this (directly or via a service that wraps it),
 * so neither a signed-in owner nor an admin in an "Als Owner ansehen"
 * preview can ever see a property outside their effective owner context by
 * editing the URL - requireEffectiveOwnerContext + canOwnerAccessProperty
 * run on every request, independent of what the client sent. Deliberately
 * does NOT use canUserAccessProperty's admin bypass here: during a preview,
 * an admin must see exactly what the previewed owner would see, nothing
 * more (see src/server/ownerContext.ts).
 *
 * A failure to resolve WHO is asking (no session, an inactive owner, a
 * transient DB hiccup getSession() fails safe on, or an admin with no
 * active preview) is an authentication problem, not "this property doesn't
 * exist" - requireEffectiveOwnerContext() redirects to /login (or /admin)
 * for that, it never reaches the code below. Once a context IS resolved,
 * `undefined` (callers already do `if (!property) notFound()`) covers both
 * "the property does not exist" and "the caller is not entitled to see
 * it" - those two remain deliberately indistinguishable to the caller.
 *
 * `allowAccountingRole` gates every page this way: it defaults to `false`,
 * so a restricted "accounting" OwnerUser (see prisma/schema.prisma#
 * OwnerUser.role) gets `undefined` - and therefore notFound() - from every
 * page that doesn't explicitly pass `true`. Only the Abrechnungen and
 * Profil pages do. This is deny-by-default on purpose: a new page added
 * later that simply calls `getProperty(propertyId)` like every existing
 * page already does is automatically closed to the accounting role without
 * that page's author having to know this role even exists - never
 * "hide the nav item and hope nobody types the URL".
 */
export async function getProperty(
  propertyId: string,
  options?: { allowAccountingRole?: boolean }
): Promise<Property | undefined> {
  const context = await requireEffectiveOwnerContext();

  let allowed: boolean;
  if (context.ownerUserRole === "accounting") {
    if (!options?.allowAccountingRole || !context.ownerUserId) return undefined;
    allowed = await canAccountingUserAccessProperty(context.ownerUserId, propertyId);
  } else {
    allowed = await canOwnerAccessProperty(context.ownerId, propertyId);
  }
  if (!allowed) return undefined;

  const property = await prisma.property.findUnique({ where: { id: propertyId } });
  if (!property) return undefined;

  return toProperty(property, context.ownerId);
}
