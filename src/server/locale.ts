import "server-only";
import { cookies, headers } from "next/headers";
import { prisma } from "@/server/db";
import { getSession } from "@/server/session";
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE_NAME, type Locale } from "@/i18n";

/**
 * Locale resolution for signed-out Owner Center pages (login, invite):
 * cookie first (the user's own explicit choice always wins once made), then
 * - only on a first visit with no cookie yet - the browser's Accept-Language
 * header ("de*" -> "de", anything else -> "en"), then the default "de".
 * Never touches the database (there is no session yet).
 */
export async function getPublicLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(LOCALE_COOKIE_NAME)?.value;
  if (isLocale(cookieValue)) return cookieValue;

  const headerList = await headers();
  const acceptLanguage = headerList.get("accept-language");
  if (acceptLanguage && !acceptLanguage.toLowerCase().startsWith("de")) return "en";

  return DEFAULT_LOCALE;
}

/**
 * Locale resolution for the signed-in Owner Center: a real Owner login's
 * `User.locale` is the source of truth (so the same person gets the same
 * language on any device), falling back to the cookie/browser-language
 * logic above for an admin "Als Owner ansehen" preview (an admin's own
 * `locale` column is never read here - /admin stays German by simply never
 * calling this function, see src/i18n's own doc comment).
 */
export async function getOwnerLocale(): Promise<Locale> {
  const session = await getSession();
  if (session?.role === "owner") {
    const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { locale: true } });
    if (isLocale(user?.locale)) return user.locale;
  }
  return getPublicLocale();
}
