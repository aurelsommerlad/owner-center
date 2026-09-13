import { redirect } from "next/navigation";
import type { Owner } from "@/types";
import { getSession } from "@/server/session";
import { prisma } from "@/server/db";
import { requireEffectiveOwnerContext } from "@/server/ownerContext";

/**
 * Data-access boundary for "which Owner is this Owner Center render for" -
 * a real Owner login, or an admin currently in an "Als Owner ansehen"
 * preview (see src/server/ownerContext.ts#requireEffectiveOwnerContext for
 * the actual resolution rule, which already redirects an unauthenticated
 * caller to /login and an admin session with no active preview to /admin -
 * an admin gets no implicit access here).
 */
export async function getCurrentOwner(): Promise<Owner> {
  const session = await getSession();
  if (!session) redirect("/login");

  const context = await requireEffectiveOwnerContext();

  const owner = await prisma.owner.findUnique({ where: { id: context.ownerId } });
  if (!owner) redirect(session.role === "admin" ? "/admin" : "/login");

  return {
    id: owner.id,
    name: owner.name,
    greetingName: owner.name,
    email: session.email,
  };
}
