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

export type OwnerTeamUserStatus = "active" | "invited" | "inactive";

/**
 * One person with Owner Center access under the signed-in owner - shown on
 * the Profil page's "Weitere Nutzer" section. Deliberately its own,
 * Owner-Center-scoped shape rather than the admin area's AdminOwnerUser
 * (see src/types/admin.ts's own doc comment on why the two type graphs
 * stay apart): this only ever carries what an owner may see about their
 * own team.
 */
export interface OwnerTeamUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: OwnerTeamUserStatus;
  /** Only set (and only meaningful) while status is "invited". */
  invitationExpiresAt?: string;
  lastLoginAt?: string;
  /** True for the row belonging to the currently signed-in user - always false during an admin "Als Owner ansehen" preview (see OwnerProfile.self). */
  isSelf: boolean;
}

/**
 * The signed-in user's own editable identity. `null` during an admin "Als
 * Owner ansehen" preview - an impersonating admin has no OwnerUser row of
 * their own under the previewed Owner to edit, so the Profil page's
 * "Persönliche Daten"/"Zugang & Sicherheit" forms are hidden rather than
 * shown against a fake identity.
 */
export interface OwnerProfileSelf {
  firstName: string;
  lastName: string;
  email: string;
}

/** Full data for the Owner Center's "Profil" page. */
export interface OwnerProfile {
  ownerName: string;
  ownerCompanyName?: string;
  self: OwnerProfileSelf | null;
  team: OwnerTeamUser[];
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
  /**
   * Accommodation/overnight revenue only, always net (VAT excluded) - never
   * Kurtaxe (city tax), never extras/services, never parking, never gross.
   * On live apaleo data this is the sum of each stay night's
   * `timeSlices[].baseAmount.netAmount` (see
   * server/integrations/apaleo/reservationService.ts) - the one apaleo
   * field that reliably isolates accommodation charges, net of tax, from
   * everything else on a folio. Every KPI derived from this figure
   * (Übernachtungsumsatz, ADR, RevPAR, Ø Buchungswert) is net as a result.
   */
  accommodationAmount: number;
  currency: string;
  /** Optional occupancy summary for the calendar tooltip, e.g. "2 Erwachsene · 1 Kind". No other guest data is ever shown. */
  occupancy?: string;
  /** Sales channel this booking came through, when the data source can classify it (see server/services/ownerPortal/channels.ts). Never present on a "blocked"/maintenance entry. */
  channel?: BookingSourceId;
}

/**
 * The kind of statement-archive document. Three are fachlich defined every
 * month may have (Eigentümerreporting, Rechnung, Gutschrift); "other" covers
 * any further supporting file. Deliberately a flat, open union so more
 * specific types can be added later without touching the components that
 * render this list - they only ever call
 * statementDocumentTypeLabel(documentType, locale).
 */
export type StatementDocumentType = "owner_report" | "invoice" | "credit_note" | "other";

/**
 * A statement-archive PDF, as it will eventually be synced in from the
 * "Owner Center / Eigentümer / {Property} / Abrechnungen / {year} / {month}"
 * Google Drive folder. Deliberately a document-archive record only - no
 * payout/financial fields, since V1 neither computes nor reads owner
 * payouts from these PDFs.
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
  /** `undefined` for a Drive-synced document - access is derived from propertyId, never from this. */
  ownerId: string | undefined;
  propertyId: string;
  /** 1-12 */
  month: number;
  year: number;
  documentType: StatementDocumentType;
  /**
   * Descriptive title. Only shown in the UI for "other" documents (e.g.
   * "Ergänzende Unterlage") - the three main types always display their
   * fixed, locale-aware label instead (see statementDocumentTypeLabel).
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
  /**
   * `false` when the comparison period has no underlying data at all (e.g.
   * the property has no apaleo history reaching that far back) - `value`
   * and `previousYear` still carry numbers (0) in that case, but callers
   * must not compute or display a delta from them, since a real observed
   * zero and "no data" are not the same thing. See
   * services/statisticsService.ts for how this is determined.
   */
  previousYearAvailable: boolean;
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
  /** Nights booked with status "owner-use" in the period - a real, apaleo-derived count. */
  ownerUseNights: ComparableMetric;
  monthlyRevenue: MonthlyRevenuePoint[];
  monthlyOccupancy: MonthlyOccupancyPoint[];
  unitStats: UnitStatistics[];
  /** The date range unitStats above actually covers, e.g. "September 2026" - may differ from `periodLabel` (the mock fallback always reports the current month regardless of the page's period filter; see services/statisticsService.ts). */
  unitStatsPeriodLabel: string;
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
