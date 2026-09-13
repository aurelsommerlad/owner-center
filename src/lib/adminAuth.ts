import { notFound, redirect } from "next/navigation";
import type { UserRole } from "@/types/admin";
import { getSession } from "@/server/session";

/**
 * Real session data, shaped for the admin UI (AdminHeader etc.). Backed by
 * src/server/session.ts's DB-validated session - no more mock identity.
 */
export interface AdminSession {
  userId: string;
  name: string;
  email: string;
  role: UserRole;
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const session = await getSession();
  if (!session) return null;
  return {
    userId: session.userId,
    name: session.name ?? session.email,
    email: session.email,
    role: session.role,
  };
}

/**
 * Server-side guard called from the /admin route layout (never from client
 * code or by hiding the nav link alone). Every route under /admin inherits
 * this check by virtue of Next.js layout nesting - it is not possible to
 * reach an /admin page without this running first, which is what makes
 * this a real access boundary: no session -> sent to /login; a valid,
 * non-admin session (e.g. an owner) -> notFound(), so /admin's existence is
 * not even confirmed to an owner who stumbles onto the URL.
 */
export async function requireAdminRole(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) redirect("/login");
  if (session.role !== "admin") notFound();
  return session;
}
