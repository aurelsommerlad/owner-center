import { redirect } from "next/navigation";
import type { Owner } from "@/types";
import { getSession } from "@/server/session";
import { prisma } from "@/server/db";
import { getEffectiveOwnerContext } from "@/server/ownerContext";

/**
 * Data-access boundary for "which Owner is this Owner Center render for" -
 * a real Owner login, or an admin currently in an "Als Owner ansehen"
 * preview (see src/server/ownerContext.ts#getEffectiveOwnerContext for the
 * actual resolution rule). Sends an unauthenticated caller to /login, and
 * an admin session with no active preview to /admin (never into the Owner
 * Center - an admin gets no implicit access here, see ownerContext.ts).
 */
export async function getCurrentOwner(): Promise<Owner> {
  const session = await getSession();
  if (!session) redirect("/login");

  const fallbackRoute = session.role === "admin" ? "/admin" : "/login";

  const context = await getEffectiveOwnerContext();
  if (!context) redirect(fallbackRoute);

  const owner = await prisma.owner.findUnique({ where: { id: context.ownerId } });
  if (!owner) redirect(fallbackRoute);

  return {
    id: owner.id,
    name: owner.name,
    greetingName: owner.name,
    email: session.email,
  };
}
