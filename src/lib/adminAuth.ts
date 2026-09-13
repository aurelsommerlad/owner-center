import { notFound } from "next/navigation";
import type { UserRole } from "@/types/admin";

/**
 * Mock stand-in for real authentication/session data. There is no login yet
 * anywhere in the app, so this always resolves to a fixed admin identity.
 */
export interface AdminSession {
  userId: string;
  name: string;
  email: string;
  role: UserRole;
}

const MOCK_ADMIN_SESSION: AdminSession = {
  userId: "admin-1",
  name: "UNIQUE PLACES Team",
  email: "admin@unique-places.example",
  role: "admin",
};

/** Replace this with a real session/auth lookup once authentication exists. */
export async function getAdminSession(): Promise<AdminSession | null> {
  return MOCK_ADMIN_SESSION;
}

/**
 * Server-side guard called from the /admin route layout (never from client
 * code or by hiding the nav link alone). Today it always passes because
 * getAdminSession() is mocked, but centralizing the check here is what lets
 * a later real auth check - reject/redirect when there is no session or
 * `role !== "admin"` - be added in this one place and immediately cover
 * every /admin route, instead of requiring every page to remember to check.
 */
export async function requireAdminRole(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session || session.role !== "admin") {
    notFound();
  }
  return session;
}
