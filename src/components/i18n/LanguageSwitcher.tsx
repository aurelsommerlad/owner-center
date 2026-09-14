"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setLocaleAction } from "@/app/actions";
import type { Locale } from "@/i18n";
import { useTranslations } from "./LocaleProvider";

/**
 * "Sprache" dropdown for the Profil page. Persists via setLocaleAction()
 * (cookie always, User.locale for a real Owner login) and then refreshes
 * the current route so every Server Component re-renders in the new
 * language - no client-side re-translation needed, this is the one seam
 * that makes the switch actually take effect.
 */
export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { locale, t } = useTranslations();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function select(next: Locale) {
    if (next === locale || pending) return;
    startTransition(async () => {
      await setLocaleAction(next);
      router.refresh();
    });
  }

  return (
    <select
      value={locale}
      disabled={pending}
      onChange={(event) => select(event.target.value as Locale)}
      aria-label={t("profile.language")}
      className={`w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-ink disabled:opacity-50 ${className}`}
    >
      <option value="de">{t("language.de")}</option>
      <option value="en">{t("language.en")}</option>
    </select>
  );
}
