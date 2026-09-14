import "server-only";
import { getSession } from "./session";
import { getEffectiveOwnerContext } from "./ownerContext";
import { prisma } from "./db";

/**
 * The signed-in owner's real identity - the one place both the dashboard
 * greeting (uebersicht/page.tsx) and the Owner Center sidebar identity block
 * (components/layout/Sidebar.tsx) read the current OwnerUser from, so the
 * two never drift into reading different fields for "who is this".
 *
 * A real Owner login always resolves to their own OwnerUser. An admin's
 * "Als Owner ansehen" preview resolves too, but ONLY when the previewed
 * Owner has exactly one active OwnerUser - AdminImpersonation itself only
 * ever carries which Owner/company is being previewed, never a specific
 * person (an Owner can have several), so anything beyond "there is only
 * one candidate" would be a guess. Returns `null` for an admin's own
 * session, an admin preview of an Owner with zero or multiple active
 * users, or any other case with no single specific person to identify -
 * callers use `null` to fall back to a neutral, nameless display.
 */
export interface SignedInOwnerIdentity {
  firstName: string;
  lastName: string;
  email: string;
}

export async function getSignedInOwnerIdentity(): Promise<SignedInOwnerIdentity | null> {
  const session = await getSession();
  if (!session) return null;

  if (session.role === "owner") {
    if (!session.ownerUserId) return null;
    const ownerUser = await prisma.ownerUser.findUnique({
      where: { id: session.ownerUserId },
      select: { firstName: true, lastName: true },
    });
    if (!ownerUser) return null;
    return { firstName: ownerUser.firstName, lastName: ownerUser.lastName, email: session.email };
  }

  if (session.role === "admin") {
    const context = await getEffectiveOwnerContext();
    if (!context?.isImpersonation) return null;

    const ownerUsers = await prisma.ownerUser.findMany({
      where: { ownerId: context.ownerId, status: "active" },
      select: { firstName: true, lastName: true, user: { select: { email: true } } },
    });
    // Only unambiguous when there is exactly one candidate - two or more
    // active users (or none at all) fall back to the neutral display
    // rather than guessing which one this preview "is".
    if (ownerUsers.length !== 1) return null;

    const [ownerUser] = ownerUsers;
    return { firstName: ownerUser.firstName, lastName: ownerUser.lastName, email: ownerUser.user.email };
  }

  return null;
}
