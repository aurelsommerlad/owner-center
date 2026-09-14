"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setLocaleAction } from "@/app/actions";
import type { Locale } from "@/i18n";
import { useTranslations } from "./LocaleProvider";

/**
 * "DE | EN" - dezent, no flags, no big button. Persists via
 * setLocaleAction() (cookie always, User.locale for a real Owner login)
 * and then refreshes the current route so every Server Component
 * re-renders in the new language - no client-side re-translation needed,
 * this is the one seam that makes the switch actually take effect.
 */
export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { locale } = useTranslations();
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
    <div className={`flex items-center gap-1.5 text-[11px] font-medium ${className}`}>
      <button
        type="button"
        onClick={() => select("de")}
        aria-pressed={locale === "de"}
        disabled={pending}
        className={`transition-colors ${locale === "de" ? "text-ink" : "text-ink-soft/70 hover:text-ink"}`}
      >
        DE
      </button>
      <span aria-hidden="true" className="text-ink-soft/30">
        |
      </span>
      <button
        type="button"
        onClick={() => select("en")}
        aria-pressed={locale === "en"}
        disabled={pending}
        className={`transition-colors ${locale === "en" ? "text-ink" : "text-ink-soft/70 hover:text-ink"}`}
      >
        EN
      </button>
    </div>
  );
}
