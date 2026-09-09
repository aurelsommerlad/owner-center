/**
 * Pure date/window math for the calendar page's view switcher (Monat / 14 Tage /
 * Woche). Deliberately free of any data fetching so both the server page and the
 * client-side navigation controls can share it without pulling in mock services.
 */
import {
  addDays,
  daysInMonth,
  formatDayMonth,
  isoDate,
  monthLabel,
  parseIsoDate,
  startOfMonth,
  startOfWeek,
} from "./dates";
import type { DateRange } from "./occupancy";

export type CalendarViewType = "month" | "twoWeeks" | "week";

export interface CalendarWindow {
  view: CalendarViewType;
  /** Normalized start date of the window (month start, or Monday of the week). */
  anchor: string;
  range: DateRange;
  label: string;
}

export function normalizeAnchor(view: CalendarViewType, anchor: string): string {
  return view === "month" ? startOfMonth(anchor) : startOfWeek(anchor);
}

function windowLengthDays(view: CalendarViewType): number {
  return view === "week" ? 7 : 14;
}

export function getCalendarWindow(view: CalendarViewType, rawAnchor: string): CalendarWindow {
  const anchor = normalizeAnchor(view, rawAnchor);

  if (view === "month") {
    const date = parseIsoDate(anchor);
    const endExclusive = addDays(anchor, daysInMonth(date.getUTCFullYear(), date.getUTCMonth() + 1));
    return {
      view,
      anchor,
      range: { start: anchor, endExclusive },
      label: `${monthLabel(date.getUTCMonth() + 1)} ${date.getUTCFullYear()}`,
    };
  }

  const length = windowLengthDays(view);
  const endExclusive = addDays(anchor, length);
  return {
    view,
    anchor,
    range: { start: anchor, endExclusive },
    label: `${formatDayMonth(anchor)} – ${formatDayMonth(addDays(endExclusive, -1))}`,
  };
}

export function shiftAnchor(view: CalendarViewType, anchor: string, direction: 1 | -1): string {
  const normalized = normalizeAnchor(view, anchor);

  if (view === "month") {
    const date = parseIsoDate(normalized);
    const totalMonths = date.getUTCFullYear() * 12 + date.getUTCMonth() + direction;
    const year = Math.floor(totalMonths / 12);
    const month = (totalMonths % 12) + 1;
    return isoDate(year, month, 1);
  }

  return addDays(normalized, direction * windowLengthDays(view));
}
