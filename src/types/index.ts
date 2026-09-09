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
  bookings: number;
  avgStayNights: number;
}

export interface PropertyStatistics {
  propertyId: string;
  revenueCurrentMonth: number;
  revenueYearToDate: number;
  revenuePreviousYearToDate: number;
  monthlyRevenue: MonthlyRevenuePoint[];
  occupancyCurrentMonthPct: number;
  occupancyYearToDatePct: number;
  occupancyPreviousYearToDatePct: number;
  monthlyOccupancy: MonthlyOccupancyPoint[];
  bookingsCount: number;
  avgStayNights: number;
  avgBookingValue: number;
  unitStats: UnitStatistics[];
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
