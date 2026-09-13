"use server";

import { redirect } from "next/navigation";
import { getSession } from "@/server/session";
import { destroySession } from "@/server/session";

/**
 * Shared by both the Owner Center and Admin sidebars/mobile navs. Reads the
 * session's role BEFORE destroying it so it can send each role back to its
 * own dedicated login flow - an admin logging out lands on /admin/login,
 * an owner on /login - rather than one shared destination.
 */
export async function logoutAction(): Promise<void> {
  const session = await getSession();
  await destroySession();
  redirect(session?.role === "admin" ? "/admin/login" : "/login");
}
