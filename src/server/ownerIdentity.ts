import "server-only";
import { getSession } from "./session";
import { prisma } from "./db";

/**
 * The signed-in owner's real identity - the one place both the dashboard
 * greeting (uebersicht/page.tsx) and the Owner Center sidebar identity block
 * (components/layout/Sidebar.tsx) read the current OwnerUser from, so the
 * two never drift into reading different fields for "who is this". Returns
 * `null` whenever there is no single specific person to identify: an
 * admin's own session, or an admin's "Als Owner ansehen" preview
 * (AdminImpersonation only carries which Owner/company is being previewed,
 * never a specific OwnerUser - an Owner can have several). Callers use
 * `null` to fall back to a neutral, nameless display rather than guessing.
 */
export interface SignedInOwnerIdentity {
  firstName: string;
  lastName: string;
  email: string;
}

export async function getSignedInOwnerIdentity(): Promise<SignedInOwnerIdentity | null> {
  const session = await getSession();
  if (!session || session.role !== "owner" || !session.ownerUserId) return null;

  const ownerUser = await prisma.ownerUser.findUnique({
    where: { id: session.ownerUserId },
    select: { firstName: true, lastName: true },
  });
  if (!ownerUser) return null;

  return { firstName: ownerUser.firstName, lastName: ownerUser.lastName, email: session.email };
}
