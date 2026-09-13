import "server-only";
import { redirect } from "next/navigation";
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
    try {
      const impersonation = await prisma.adminImpersonation.findFirst({
        where: { sessionId: session.sessionId, endedAt: null },
        orderBy: { startedAt: "desc" },
      });
      if (!impersonation) return null;

      // Same activity bar a real Owner login has to clear above - a preview
      // must see exactly what that owner would see, including "nothing,
      // because this account is deactivated", never more.
      const owner = await prisma.owner.findUnique({ where: { id: impersonation.ownerId } });
      if (!owner || owner.status !== "active") return null;

      return { ownerId: impersonation.ownerId, isImpersonation: true };
    } catch (error) {
      // Same fail-safe philosophy as getSession() above: a DB hiccup here
      // must never propagate as an uncaught exception and crash the page -
      // it degrades to "no context", which every caller already treats as
      // "not authenticated" and never grants access on.
      console.error("[ownerContext] impersonation lookup failed - treating as no context:", error);
      return null;
    }
  }

  return null;
}

/**
 * `getEffectiveOwnerContext()`, but redirects instead of returning `null` -
 * the one seam every Owner-Center-facing entry point (a page/layout, or a
 * data-access function like services/propertyService.ts#getProperty) should
 * call to resolve "who is this render for". A `null` context here always
 * means an AUTHENTICATION problem (no session, an inactive owner, a DB
 * hiccup getSession() failed safe on, or an admin with no active preview) -
 * never "this property doesn't exist" - so this always sends the caller
 * back to sign in (or to /admin for an admin with no preview), rather than
 * letting a caller turn "please sign in again" into a 404. Mirrors
 * getSession()'s own "no session -> /login" for a caller that has no
 * session at all, so a transient failure here degrades to a re-auth
 * prompt, never a misleading "page not found".
 */
export async function requireEffectiveOwnerContext(): Promise<EffectiveOwnerContext> {
  const session = await getSession();
  if (!session) redirect("/login");

  const fallbackRoute = session.role === "admin" ? "/admin" : "/login";
  const context = await getEffectiveOwnerContext();
  if (!context) redirect(fallbackRoute);

  return context;
}

export interface OwnerSelfSession {
  userId: string;
  sessionId: string;
  ownerId: string;
  ownerUserId: string;
  email: string;
}

/**
 * Like requireEffectiveOwnerContext(), but only ever succeeds for a REAL
 * Owner login (never an admin "Als Owner ansehen" preview) and additionally
 * resolves the signed-in user's OWN OwnerUser identity - for the Profil
 * page's self-service actions (change own name/email/password), which need
 * an actual OwnerUser row to edit. An impersonating admin has none of their
 * own under the previewed Owner, so this redirects them away rather than
 * inventing a fake identity - in normal use the Profil page never even
 * renders these actions' forms during a preview (see
 * src/services/profileService.ts#getOwnerProfile), so this redirect is
 * defence-in-depth, not a path real usage takes.
 */
export async function requireOwnerSelfSession(): Promise<OwnerSelfSession> {
  const session = await getSession();
  if (!session) redirect("/login");

  const fallbackRoute = session.role === "admin" ? "/admin" : "/login";
  if (
    session.role !== "owner" ||
    !session.ownerId ||
    !session.ownerUserId ||
    session.ownerStatus !== "active" ||
    session.ownerUserStatus !== "active"
  ) {
    redirect(fallbackRoute);
  }

  return {
    userId: session.userId,
    sessionId: session.sessionId,
    ownerId: session.ownerId,
    ownerUserId: session.ownerUserId,
    email: session.email,
  };
}
