"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getSession } from "@/server/session";
import { destroySession } from "@/server/session";
import { prisma } from "@/server/db";
import { LOCALE_COOKIE_NAME, type Locale } from "@/i18n";

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

/**
 * The Owner Center's DE|EN language switcher. Always sets the cookie
 * (covers signed-out pages - login, invite - and doubles as the fallback
 * for an admin "Als Owner ansehen" preview); additionally persists to
 * `User.locale` for a real Owner login, so the same person gets the same
 * language on another device. Never called from /admin - the admin area
 * has no switcher and stays German by simply never reading this.
 */
export async function setLocaleAction(locale: Locale): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE_NAME, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  const session = await getSession();
  if (session?.role === "owner") {
    await prisma.user.update({ where: { id: session.userId }, data: { locale } }).catch(() => {});
  }
}
