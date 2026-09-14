import type { Locale } from "@/i18n";

/**
 * `locale` defaults to "de" on every function here. That is what keeps the
 * admin area (which imports these same functions - see e.g.
 * src/app/admin/(protected)/owners/[id]/page.tsx - and never passes a
 * locale) byte-for-byte unchanged: only an Owner Center call site that
 * explicitly resolves and passes "en" ever sees different output.
 */
function intlLocale(locale: Locale): string {
  return locale === "en" ? "en-US" : "de-DE";
}

export function formatCurrency(amount: number, currency = "EUR", fractionDigits = 2, locale: Locale = "de"): string {
  return new Intl.NumberFormat(intlLocale(locale), {
    style: "currency",
    currency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(amount);
}

export function formatNumber(value: number, fractionDigits = 1, locale: Locale = "de"): string {
  return new Intl.NumberFormat(intlLocale(locale), {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

export function formatPercent(value: number, fractionDigits = 0, locale: Locale = "de"): string {
  const number = formatNumber(value, fractionDigits, locale);
  return locale === "en" ? `${number}%` : `${number} %`;
}

export function formatDelta(value: number, fractionDigits = 0, locale: Locale = "de"): string {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "±";
  return `${sign}${formatNumber(Math.abs(value), fractionDigits, locale)}`;
}

export function formatFileSize(sizeKb: number, locale: Locale = "de"): string {
  if (sizeKb < 1024) return `${sizeKb} KB`;
  return `${formatNumber(sizeKb / 1024, 1, locale)} MB`;
}

export function formatShortDate(iso: string, locale: Locale = "de"): string {
  return new Intl.DateTimeFormat(intlLocale(locale), { day: "2-digit", month: "2-digit", year: "numeric" }).format(
    new Date(iso)
  );
}

export function formatShortDateTime(iso: string, locale: Locale = "de"): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}
