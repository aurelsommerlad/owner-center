import { redirect } from "next/navigation";
import type { Owner } from "@/types";
import { getSession } from "@/server/session";
import { prisma } from "@/server/db";

/**
 * Data-access boundary for the signed-in owner. Reads the real session
 * (see src/server/session.ts) and resolves the linked Owner row - no more
 * fixed mock identity. Sends an unauthenticated caller to /login and an
 * admin session to /admin, so every Owner Center page that calls this
 * (directly or via getPropertiesForOwner) is implicitly session-gated too.
 */
export async function getCurrentOwner(): Promise<Owner> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "owner" || !session.ownerId) redirect("/admin");

  const owner = await prisma.owner.findUnique({ where: { id: session.ownerId } });
  if (!owner) redirect("/login");

  return {
    id: owner.id,
    name: owner.name,
    greetingName: owner.name,
    email: session.email,
  };
}
