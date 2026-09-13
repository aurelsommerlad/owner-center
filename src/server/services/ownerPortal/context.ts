import "server-only";
import { cache } from "react";
import { prisma } from "@/server/db";
import { getEffectiveOwnerContext } from "@/server/ownerContext";
import { canOwnerAccessProperty } from "@/server/permissions";

export interface OwnerPortalPropertyContext {
  propertyId: string;
  /** `null` when this property has not (yet) been mapped to a live apaleo property in /admin. */
  apaleoPropertyId: string | null;
}

/**
 * THE authorization + apaleo-id resolution seam for every live Owner Portal
 * read: eingeloggter User -> effektiver Owner-Kontext -> erlaubtes internes
 * Property -> apaleoPropertyId. Every function in this directory calls this
 * first and never trusts a propertyId from its caller - so a real Owner
 * login and an admin "Als Owner ansehen" preview are authorized identically,
 * and an owner can never reach another owner's apaleo data by any path.
 *
 * `cache()` memoizes per request (per React render), so calling this
 * repeatedly across the several parallel Übersicht/Kalender/Statistiken
 * data calls for the same propertyId costs one DB round trip, not several.
 *
 * Returns `null` when the current session may not see this property - also
 * the outcome for a nonexistent propertyId, deliberately indistinguishable
 * from "not allowed" (matches services/propertyService.ts#getProperty).
 */
export const resolveOwnerPortalProperty = cache(async function resolveOwnerPortalProperty(
  propertyId: string
): Promise<OwnerPortalPropertyContext | null> {
  const context = await getEffectiveOwnerContext();
  if (!context) return null;

  const allowed = await canOwnerAccessProperty(context.ownerId, propertyId);
  if (!allowed) return null;

  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: { apaleoPropertyId: true },
  });
  if (!property) return null;

  return { propertyId, apaleoPropertyId: property.apaleoPropertyId };
});
