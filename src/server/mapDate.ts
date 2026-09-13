import "server-only";

/**
 * Every UI-facing type in this app (Owner, Property, StatementDocument, the
 * Admin* types, ...) declares its date fields as plain "yyyy-MM-dd" strings
 * (see e.g. lib/format.ts#formatShortDate), a convention that predates the
 * database. Prisma stores/returns real `Date` objects for `DateTime`
 * columns, so every service maps through these two helpers at the
 * DB-row -> UI-shape boundary rather than changing every type/component to
 * work with `Date`.
 */

export function toDateString(date: Date): string;
export function toDateString(date: Date | null): string | null;
export function toDateString(date: Date | null): string | null {
  return date ? date.toISOString().slice(0, 10) : null;
}

/** Parses a "yyyy-MM-dd" (or full ISO) string back into a `Date` for writes. */
export function fromDateString(value: string): Date {
  return new Date(value);
}
