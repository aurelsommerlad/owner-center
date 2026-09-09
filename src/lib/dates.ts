/** Date helpers working on ISO "yyyy-MM-dd" strings and UTC-safe Date math. */

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

const WEEKDAY_LABELS = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
const MONTH_LABELS = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
];

export function weekdayLabel(iso: string): string {
  return WEEKDAY_LABELS[parseIsoDate(iso).getUTCDay()];
}

export function dayOfMonth(iso: string): number {
  return parseIsoDate(iso).getUTCDate();
}

export function monthLabel(month: number): string {
  return MONTH_LABELS[month - 1];
}

/** Short "dd.MM." label without year, e.g. for compact arrival/departure lists. */
export function formatDayMonth(iso: string): string {
  const date = parseIsoDate(iso);
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${day}.${month}.`;
}

/** Long "9. September" label, e.g. for "Heute, 9. September". */
export function formatLongDayMonth(iso: string): string {
  return `${dayOfMonth(iso)}. ${monthLabel(parseIsoDate(iso).getUTCMonth() + 1)}`;
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
