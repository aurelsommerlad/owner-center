/**
 * Domain types for the UNIQUE PLACES owner portal.
 *
 * These types describe the shape the UI consumes, independent of where the
 * data comes from. In V1 the /src/data/mock layer provides fixtures that
 * satisfy these types; a later apaleo integration only has to produce the
 * same shapes inside /src/services, so components never change.
 */

export interface Owner {
  id: string;
  /** Full display name, e.g. "Familie Schneider". */
  name: string;
  /** e.g. "Familie Schneider" used in greetings ("Hallo {greetingName}"). */
  greetingName: string;
  email: string;
}

export interface GeoLocation {
  city: string;
  region: string;
}

export interface Property {
  id: string;
  ownerId: string;
  name: string;
  location: GeoLocation;
  /** Short supporting line shown under the property name. */
  tagline?: string;
  /** Seed used to derive a consistent placeholder hero image/palette. */
  imageSeed: string;
}

export type UnitStatusToday = "occupied" | "free" | "blocked" | "owner-use";

export interface Unit {
  id: string;
  propertyId: string;
  name: string;
  minOccupancy: number;
  maxOccupancy: number;
  sizeSqm: number;
  imageSeed: string;
  /** Sort order within the property, e.g. LÆKE 01 before LÆKE 02. */
  sortOrder: number;
}

export type ReservationStatus = "confirmed" | "blocked" | "owner-use";

export interface Reservation {
  id: string;
  /** Internal-only reference, never rendered in the UI. */
  internalRef: string;
  unitId: string;
  propertyId: string;
  /** ISO date (yyyy-MM-dd), inclusive. */
  checkIn: string;
  /** ISO date (yyyy-MM-dd), exclusive (checkout morning). */
  checkOut: string;
  status: ReservationStatus;
  totalAmount: number;
  currency: string;
}

export type StatementStatus = "ready" | "processing" | "paid";

export interface OwnerStatement {
  id: string;
  propertyId: string;
  /** 1-12 */
  month: number;
  year: number;
  /** Display label, e.g. "August 2026". */
  label: string;
  payoutAmount: number;
  currency: string;
  status: StatementStatus;
  fileName: string;
}

/**
 * The kind of statement-archive document. Three are fachlich defined every
 * month may have (Eigentümerreporting, Rechnung, Gutschrift); "other" covers
 * any further supporting file. Deliberately a flat, open union so more
 * specific types can be added later without touching the components that
 * render this list - they only ever look up
 * STATEMENT_DOCUMENT_TYPE_LABEL[documentType].
 */
export type StatementDocumentType = "owner_report" | "invoice" | "credit_note" | "other";

/**
 * A statement-archive PDF, as it will eventually be synced in from the
 * "Owner Center / Eigentümer / {Property} / Abrechnungen / {year} / {month}"
 * Google Drive folder. Deliberately a document-archive record only - no
 * payout/financial fields - since V1 neither computes nor reads owner
 * payouts from these PDFs (see OwnerStatement for the separate payout
 * status shown on the Übersicht page, which this type does not replace).
 *
 * A month is not limited to the three main documents: Eigentümerreporting,
 * Rechnung and Gutschrift are the ones fachlich defined, but a month may
 * have any subset of them plus any number of further ("other") files added
 * at any time, each tracked (and shown as "Neu"/"Gesehen") independently. A
 * document is uniquely identified by
 * ownerId + propertyId + year + month + documentType (plus `version` for
 * replacements, and an extra discriminator for multiple "other" documents in
 * the same month) - never by fileName alone, since the later Drive sync must
 * not rely on file naming.
 *
 * That sync only has to resolve ownerId + propertyId + year + month to the
 * files in that month's Drive folder (which may hold any number of files,
 * not exactly three) and fill in driveFileId per document; every other field
 * already has the shape it needs (see services/statementDocumentService.ts).
 */
export interface StatementDocument {
  id: string;
  ownerId: string;
  propertyId: string;
  /** 1-12 */
  month: number;
  year: number;
  documentType: StatementDocumentType;
  /**
   * Descriptive title. Only shown in the UI for "other" documents (e.g.
   * "Ergänzende Unterlage") - the three main types always display their
   * fixed STATEMENT_DOCUMENT_TYPE_LABEL instead.
   */
  title: string;
  fileName: string;
  /** Google Drive file id. `null` until the Drive integration is wired up. */
  driveFileId: string | null;
  /** Bumped whenever UNIQUE PLACES replaces this document with a corrected version. */
  version: number;
  /** ISO date this version was made available to the owner. */
  publishedAt: string;
  /** ISO date of the most recent version replacement, if any. */
  updatedAt: string | null;
  /**
   * ISO date the owner first opened this document since its last
   * publish/update. Drives the "Neu"/"Gesehen" status; not shown verbatim
   * in the UI.
   */
  firstViewedAt: string | null;
  /** ISO date of the first download of the current version. Internal-only. */
  firstDownloadedAt: string | null;
  /** ISO date of the most recent download - shown to the owner. */
  lastDownloadedAt: string | null;
  /** Internal-only download counter. */
  downloadCount: number;
}

export type DocumentCategory =
  | "vertraege"
  | "abrechnungen"
  | "steuerlich"
  | "objektunterlagen"
  | "sonstiges";

export interface OwnerDocument {
  id: string;
  propertyId: string;
  category: DocumentCategory;
  name: string;
  fileType: "pdf" | "docx" | "xlsx";
  fileSizeKb: number;
  /** ISO date (yyyy-MM-dd). */
  date: string;
  fileName: string;
}

export interface MonthlyRevenuePoint {
  month: number;
  year: number;
  revenue: number;
}

export interface MonthlyOccupancyPoint {
  month: number;
  year: number;
  occupancyPct: number;
}

export interface UnitStatistics {
  unitId: string;
  occupancyPct: number;
  revenue: number;
  adr: number;
  revPar: number;
  bookings: number;
  avgStayNights: number;
}

/** A KPI value paired with the same metric for the comparison period (previous year). */
export interface ComparableMetric {
  value: number;
  previousYear: number;
}

/**
 * A sales channel a booking came through. Modeled as an open string union
 * (plus an `id` field on the breakdown row) rather than hardcoded UI text, so
 * a later apaleo integration can introduce further channels without any
 * change to the components that render this list - they only ever map over
 * `BookingSourceBreakdown[]`.
 */
export type BookingSourceId = "direct" | "booking_com" | "airbnb" | "other";

export interface BookingSourceBreakdown {
  source: BookingSourceId;
  /** Display label, e.g. "Booking.com" - kept with the data, never hardcoded in UI. */
  label: string;
  bookingCount: number;
  revenue: number;
  /** 0-100, this source's share of total revenue for the period. */
  revenueShare: number;
}

export interface PropertyStatistics {
  propertyId: string;
  /** e.g. "September 2026" or "Jahr 2026". */
  periodLabel: string;
  /** e.g. "Vorjahr" - currently the only supported comparison basis. */
  comparisonLabel: string;
  occupancyPct: ComparableMetric;
  revenue: ComparableMetric;
  adr: ComparableMetric;
  revPar: ComparableMetric;
  bookingsCount: ComparableMetric;
  avgStayNights: ComparableMetric;
  avgBookingValue: ComparableMetric;
  /** Illustrative mock figure until real owner-statement logic exists. */
  ownerPayout: ComparableMetric;
  monthlyRevenue: MonthlyRevenuePoint[];
  monthlyOccupancy: MonthlyOccupancyPoint[];
  unitStats: UnitStatistics[];
  /** Sums exactly to `revenue.value` / `bookingsCount.value` for the period. */
  bookingSources: BookingSourceBreakdown[];
  /** Illustrative mock figures until real booking-lead-time/cancellation data exists. */
  avgLeadTimeDays: number;
  cancellationRatePct: number;
}

/** KPI summary shown on the Übersicht page for a given property. */
export interface PropertyOverviewKpis {
  occupancyPct: number;
  occupancyPctPreviousYear?: number;
  revenue: number;
  revenuePreviousYear?: number;
  bookingsCount: number;
  bookingsCountPreviousYear?: number;
  avgStayNights: number;
  avgStayNightsPreviousYear?: number;
}
