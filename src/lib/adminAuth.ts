import { notFound, redirect } from "next/navigation";
import type { UserRole } from "@/types/admin";
import { getSession } from "@/server/session";
import { prisma } from "@/server/db";
import { adminAccountExistsForRouting } from "@/server/adminBootstrapCore";

/**
 * Real session data, shaped for the admin UI (AdminHeader etc.). Backed by
 * src/server/session.ts's DB-validated session - no more mock identity.
 */
export interface AdminSession {
  sessionId: string;
  userId: string;
  name: string;
  email: string;
  role: UserRole;
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const session = await getSession();
  if (!session) return null;
  return {
    sessionId: session.sessionId,
    userId: session.userId,
    name: session.name ?? session.email,
    email: session.email,
    role: session.role,
  };
}

/**
 * Server-side guard called from the /admin/(protected) route group's layout
 * (never from client code or by hiding the nav link alone). Every route
 * under there inherits this check by virtue of Next.js layout nesting - it
 * is not possible to reach an /admin page without this running first,
 * which is what makes this a real access boundary:
 *   - no admin account exists yet at all -> /admin/setup (the one-time,
 *     unauthenticated first-run setup - see src/app/admin/setup/);
 *   - an admin exists but there is no session -> /admin/login (the
 *     dedicated admin login flow - never /login, which only ever
 *     authenticates owners);
 *   - a valid, non-admin session (e.g. an owner) -> notFound(), so
 *     /admin's existence is not even confirmed to an owner who stumbles
 *     onto the URL.
 */
export async function requireAdminRole(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) {
    const hasAdmin = await adminAccountExistsForRouting(prisma);
    redirect(hasAdmin ? "/admin/login" : "/admin/setup");
  }
  if (session.role !== "admin") notFound();
  return session;
}
