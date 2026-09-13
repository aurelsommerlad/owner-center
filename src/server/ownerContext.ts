import "server-only";
import { prisma } from "./db";
import { getSession } from "./session";

export interface EffectiveOwnerContext {
  ownerId: string;
  /** true when this context comes from an admin "Als Owner ansehen" preview, not a real Owner login. */
  isImpersonation: boolean;
}

/**
 * Resolves "which Owner's data is the current request allowed to see" -
 * the single seam every Owner-Center-facing query goes through, whether
 * the signed-in user is a real Owner login or an admin currently in an
 * "Als Owner ansehen" preview (see src/app/admin/actions.ts#
 * startImpersonationAction). This is also the shape a later apaleo
 * integration is meant to build on: signed-in user -> effective owner
 * context -> allowed properties (via OwnerPropertyAccess) -> apaleoPropertyId.
 *
 * Returns `null` for: no session, a real owner whose Owner/OwnerUser row
 * is no longer "active", or an admin session with no active preview.
 * Deliberately NEVER falls back to "admin sees everything" here - that
 * bypass exists only in src/server/permissions.ts#canUserAccessProperty
 * for admin-side (non-Owner-Center) reads. An admin who has not started a
 * preview has no Owner Center access at all.
 */
export async function getEffectiveOwnerContext(): Promise<EffectiveOwnerContext | null> {
  const session = await getSession();
  if (!session) return null;

  if (session.role === "owner") {
    if (!session.ownerId || session.ownerStatus !== "active" || session.ownerUserStatus !== "active") {
      return null;
    }
    return { ownerId: session.ownerId, isImpersonation: false };
  }

  if (session.role === "admin") {
    const impersonation = await prisma.adminImpersonation.findFirst({
      where: { sessionId: session.sessionId, endedAt: null },
      orderBy: { startedAt: "desc" },
    });
    if (!impersonation) return null;
    return { ownerId: impersonation.ownerId, isImpersonation: true };
  }

  return null;
}
