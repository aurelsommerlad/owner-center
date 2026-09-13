import type { Property } from "@/types";
import { prisma } from "@/server/db";
import { canOwnerAccessProperty } from "@/server/permissions";
import { requireEffectiveOwnerContext } from "@/server/ownerContext";
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
 */
export async function getProperty(propertyId: string): Promise<Property | undefined> {
  const context = await requireEffectiveOwnerContext();

  const allowed = await canOwnerAccessProperty(context.ownerId, propertyId);
  if (!allowed) return undefined;

  const property = await prisma.property.findUnique({ where: { id: propertyId } });
  if (!property) return undefined;

  return toProperty(property, context.ownerId);
}
