/**
 * The Owner Center's supported UI languages. Deliberately just a two-value
 * union today - the whole point of this module (and the dictionary/t()
 * setup around it) is that adding a third locale later means adding one
 * more entry here plus one more dictionary file, never touching every
 * component that calls t(). The admin area (/admin/*) never reads this -
 * it stays German-only by simply never importing anything from `@/i18n`.
 */
export type Locale = "de" | "en";

export const DEFAULT_LOCALE: Locale = "de";

export const SUPPORTED_LOCALES: readonly Locale[] = ["de", "en"];

export function isLocale(value: string | null | undefined): value is Locale {
  return value === "de" || value === "en";
}

/** Name of the cookie that carries the chosen locale for signed-out pages (login, invite) and as a fallback for signed-in owners. */
export const LOCALE_COOKIE_NAME = "up_locale";
