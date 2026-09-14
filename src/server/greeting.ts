import "server-only";
import { getSession } from "./session";
import { prisma } from "./db";

/**
 * The signed-in owner's display name for the dashboard greeting - "Vorname
 * Nachname", never an apaleo name, never the Owner/company name. Returns
 * `null` whenever there is no single specific person to greet by name:
 * an admin's own session, or an admin's "Als Owner ansehen" preview
 * (AdminImpersonation only carries which Owner/company is being previewed,
 * never a specific OwnerUser - an Owner can have several). Callers use
 * `null` to fall back to a neutral, nameless greeting rather than guessing.
 */
export async function getSignedInOwnerDisplayName(): Promise<string | null> {
  const session = await getSession();
  if (!session || session.role !== "owner" || !session.ownerUserId) return null;

  const ownerUser = await prisma.ownerUser.findUnique({
    where: { id: session.ownerUserId },
    select: { firstName: true, lastName: true },
  });
  if (!ownerUser) return null;

  return `${ownerUser.firstName} ${ownerUser.lastName}`.trim();
}
