import { de, type Dictionary } from "./de";
import { en } from "./en";
import type { Locale } from "./types";

export type { Dictionary } from "./de";
export type { Locale } from "./types";
export type { TranslationKey, Translator } from "./t";
export { createTranslator } from "./t";
export { DEFAULT_LOCALE, SUPPORTED_LOCALES, LOCALE_COOKIE_NAME, isLocale } from "./types";

const DICTIONARIES: Record<Locale, Dictionary> = { de, en };

export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale];
}
