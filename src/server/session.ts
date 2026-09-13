import "server-only";
import { cookies } from "next/headers";
import { prisma } from "./db";

/**
 * DB-backed sessions: the cookie holds nothing but an opaque session id -
 * never a signed/encoded token carrying identity or claims - so there is no
 * signing secret anywhere in the app, and a session can be revoked
 * server-side at any time (logout, or an admin deactivating an owner) by
 * deleting/ignoring its row. This is what "Secrets nur serverseitig" means
 * here in practice: there is no client-readable secret to protect at all.
 */

const SESSION_COOKIE = "up_session";
const SESSION_TTL_DAYS = 30;

export type UserRole = "admin" | "owner";

export interface SessionData {
  sessionId: string;
  userId: string;
  email: string;
  role: UserRole;
  /** Admin-only display name (see User.name). */
  name: string | null;
  /** Present only for role "owner". */
  ownerId: string | null;
  ownerUserId: string | null;
  ownerStatus: string | null;
  ownerUserStatus: string | null;
}

/**
 * Reads and validates the session cookie against the Session table. Safe to
 * call from Server Components (read-only) as well as Server Actions/Route
 * Handlers. Returns `null` for a missing, unknown, or expired session -
 * callers decide what to do (redirect to /login, notFound, etc.), this
 * function never redirects itself so it stays usable from plain data
 * services too.
 */
export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { user: { include: { ownerUser: { include: { owner: true } } } } },
  });
  if (!session) return null;

  if (session.expiresAt.getTime() <= Date.now()) {
    // Expired - best-effort cleanup, never block the caller on it.
    void prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  const { user } = session;
  return {
    sessionId: session.id,
    userId: user.id,
    email: user.email,
    role: user.role as UserRole,
    name: user.name,
    ownerId: user.ownerUser?.ownerId ?? null,
    ownerUserId: user.ownerUser?.id ?? null,
    ownerStatus: user.ownerUser?.owner.status ?? null,
    ownerUserStatus: user.ownerUser?.status ?? null,
  };
}

/**
 * Creates a Session row for `userId` and sets the cookie. Only callable from
 * a Server Action or Route Handler (Next.js only allows cookie mutation
 * there, never from a Server Component render).
 */
export async function createSession(userId: string): Promise<void> {
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
  const session = await prisma.session.create({ data: { userId, expiresAt } });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, session.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

/** Deletes the current session (if any) and clears the cookie. Server Action/Route Handler only. */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (sessionId) {
    await prisma.session.delete({ where: { id: sessionId } }).catch(() => {});
  }
  cookieStore.delete(SESSION_COOKIE);
}
