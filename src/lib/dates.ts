/** Date helpers working on ISO "yyyy-MM-dd" strings and UTC-safe Date math. */
import type { Locale } from "@/i18n";

/**
 * `locale` defaults to "de" everywhere in this file, so every existing
 * call site - most importantly every admin-area one (see
 * src/lib/format.ts's own note on this) - keeps its exact current output
 * unless it explicitly passes "en". Only Owner Center call sites ever pass
 * a resolved locale.
 */
function intlLocale(locale: Locale): string {
  return locale === "en" ? "en-US" : "de-DE";
}

export function isoDate(year: number, month: number, day: number): string {
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

export function parseIsoDate(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function addDays(iso: string, days: number): string {
  const date = parseIsoDate(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function nightsBetween(checkIn: string, checkOut: string): number {
  const ms = parseIsoDate(checkOut).getTime() - parseIsoDate(checkIn).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

/** True if [rangeStart, rangeEnd) and [checkIn, checkOut) overlap. */
export function rangesOverlap(
  rangeStart: string,
  rangeEnd: string,
  checkIn: string,
  checkOut: string
): boolean {
  return checkIn < rangeEnd && checkOut > rangeStart;
}

export function isSameOrAfter(a: string, b: string): boolean {
  return a >= b;
}

export function isSameOrBefore(a: string, b: string): boolean {
  return a <= b;
}

/**
 * Locale-aware short weekday label ("Mo"/"Mon", ...), via Intl rather than
 * a hardcoded German array - see this file's own doc comment on why
 * `locale` always defaults to "de".
 */
export function weekdayLabel(iso: string, locale: Locale = "de"): string {
  return new Intl.DateTimeFormat(intlLocale(locale), { weekday: "short", timeZone: "UTC" }).format(parseIsoDate(iso));
}

export function dayOfMonth(iso: string): number {
  return parseIsoDate(iso).getUTCDate();
}

export function monthLabel(month: number, locale: Locale = "de"): string {
  return new Intl.DateTimeFormat(intlLocale(locale), { month: "long", timeZone: "UTC" }).format(
    new Date(Date.UTC(2000, month - 1, 1))
  );
}

/** Locale-aware short month label ("Jan"/"Jan", "Mär"/"Mar", ...), for compact axis labels like the Statistiken trend chart. */
export function monthShortLabel(month: number, locale: Locale = "de"): string {
  return new Intl.DateTimeFormat(intlLocale(locale), { month: "short", timeZone: "UTC" }).format(
    new Date(Date.UTC(2000, month - 1, 1))
  );
}

/** Short "dd.MM." label without year, e.g. for compact arrival/departure lists. */
export function formatDayMonth(iso: string): string {
  const date = parseIsoDate(iso);
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${day}.${month}.`;
}

/** Long "9. September"/"September 9" label, e.g. for "Heute, 9. September"/"Today, September 9". */
export function formatLongDayMonth(iso: string, locale: Locale = "de"): string {
  const month = monthLabel(parseIsoDate(iso).getUTCMonth() + 1, locale);
  return locale === "en" ? `${month} ${dayOfMonth(iso)}` : `${dayOfMonth(iso)}. ${month}`;
}

/**
 * "10.–14. September 2026" / "September 10–14, 2026" style range for a
 * reservation tooltip. Falls back to naming both months when the stay
 * crosses one.
 */
export function formatDateRange(checkIn: string, checkOut: string, locale: Locale = "de"): string {
  const start = parseIsoDate(checkIn);
  const end = parseIsoDate(checkOut);
  const sameMonth = start.getUTCFullYear() === end.getUTCFullYear() && start.getUTCMonth() === end.getUTCMonth();

  if (locale === "en") {
    const endMonth = monthLabel(end.getUTCMonth() + 1, locale);
    if (sameMonth) {
      return `${endMonth} ${start.getUTCDate()}–${end.getUTCDate()}, ${end.getUTCFullYear()}`;
    }
    const startMonth = monthLabel(start.getUTCMonth() + 1, locale);
    return `${startMonth} ${start.getUTCDate()} – ${endMonth} ${end.getUTCDate()}, ${end.getUTCFullYear()}`;
  }

  if (sameMonth) {
    return `${start.getUTCDate()}.–${end.getUTCDate()}. ${monthLabel(end.getUTCMonth() + 1, locale)} ${end.getUTCFullYear()}`;
  }
  return `${start.getUTCDate()}. ${monthLabel(start.getUTCMonth() + 1, locale)} – ${end.getUTCDate()}. ${monthLabel(
    end.getUTCMonth() + 1,
    locale
  )} ${end.getUTCFullYear()}`;
}

export function isWeekend(iso: string): boolean {
  const day = parseIsoDate(iso).getUTCDay();
  return day === 0 || day === 6;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Monday of the ISO week containing `iso`. */
export function startOfWeek(iso: string): string {
  const day = parseIsoDate(iso).getUTCDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  return addDays(iso, diffToMonday);
}

/** First day of the calendar month containing `iso`. */
export function startOfMonth(iso: string): string {
  const date = parseIsoDate(iso);
  return isoDate(date.getUTCFullYear(), date.getUTCMonth() + 1, 1);
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}
