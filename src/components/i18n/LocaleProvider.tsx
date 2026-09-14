"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { createTranslator, type Dictionary, type Locale, type Translator } from "@/i18n";

interface LocaleContextValue {
  locale: Locale;
  dict: Dictionary;
  t: Translator;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

/**
 * Makes the current locale/dictionary available to every Client Component
 * under the Owner Center's `[propertyId]` tree via `useTranslations()`,
 * without prop-drilling `t` through every layout. `locale`/`dict` are
 * resolved server-side once per request (see
 * src/app/[propertyId]/layout.tsx) and passed in here as plain, serializable
 * props - this provider itself does no locale resolution of its own.
 */
export function LocaleProvider({
  locale,
  dict,
  children,
}: {
  locale: Locale;
  dict: Dictionary;
  children: ReactNode;
}) {
  const value = useMemo(() => ({ locale, dict, t: createTranslator(dict) }), [locale, dict]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useTranslations(): LocaleContextValue {
  const context = useContext(LocaleContext);
  if (!context) throw new Error("useTranslations must be used within a LocaleProvider");
  return context;
}
