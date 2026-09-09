/**
 * Illustrative monthly performance series for LÆKE, spanning 2025 and 2026.
 *
 * The day-level reservation mock data (src/data/mock/reservations.ts) only
 * covers a ~6 week window around September 2026, which is enough to drive the
 * Übersicht/Kalender pages but not a 24-month "Jahresverlauf" chart. This file
 * fills that gap with a hand-authored, seasonally plausible Bodensee-lake
 * curve (low in winter, peaking in July/August) so the Statistiken page has
 * something coherent to plot.
 *
 * September 2026 is intentionally close to the numbers the reservation-based
 * mock data already produces on the Übersicht page (~73 % occupancy,
 * ~41.002 € revenue) so the two pages read consistently; the statisticsService
 * overrides that single month with the live figure at request time so it is
 * always exact, never just "close".
 */

export interface MonthlyMockPoint {
  month: number;
  revenue: number;
  occupancyPct: number;
  bookings: number;
  avgStayNights: number;
}

export const UNIT_COUNT = 9;

export const MONTHLY_SERIES_2026: MonthlyMockPoint[] = [
  { month: 1, revenue: 10_600, occupancyPct: 26, bookings: 24, avgStayNights: 3.0 },
  { month: 2, revenue: 11_800, occupancyPct: 29, bookings: 24, avgStayNights: 3.0 },
  { month: 3, revenue: 16_200, occupancyPct: 37, bookings: 32, avgStayNights: 3.2 },
  { month: 4, revenue: 23_700, occupancyPct: 51, bookings: 40, avgStayNights: 3.4 },
  { month: 5, revenue: 31_500, occupancyPct: 63, bookings: 49, avgStayNights: 3.6 },
  { month: 6, revenue: 43_800, occupancyPct: 79, bookings: 51, avgStayNights: 4.2 },
  { month: 7, revenue: 54_200, occupancyPct: 89, bookings: 54, avgStayNights: 4.6 },
  { month: 8, revenue: 56_100, occupancyPct: 92, bookings: 56, avgStayNights: 4.6 },
  { month: 9, revenue: 41_002, occupancyPct: 73, bookings: 52, avgStayNights: 3.8 },
  { month: 10, revenue: 27_300, occupancyPct: 57, bookings: 47, avgStayNights: 3.4 },
  { month: 11, revenue: 13_900, occupancyPct: 33, bookings: 30, avgStayNights: 3.0 },
  { month: 12, revenue: 18_600, occupancyPct: 41, bookings: 32, avgStayNights: 3.6 },
];

export const MONTHLY_SERIES_2025: MonthlyMockPoint[] = [
  { month: 1, revenue: 8_700, occupancyPct: 21, bookings: 21, avgStayNights: 2.8 },
  { month: 2, revenue: 9_700, occupancyPct: 24, bookings: 22, avgStayNights: 2.8 },
  { month: 3, revenue: 13_400, occupancyPct: 31, bookings: 29, avgStayNights: 3.0 },
  { month: 4, revenue: 20_100, occupancyPct: 45, bookings: 38, avgStayNights: 3.2 },
  { month: 5, revenue: 27_300, occupancyPct: 57, bookings: 47, avgStayNights: 3.4 },
  { month: 6, revenue: 38_600, occupancyPct: 72, bookings: 49, avgStayNights: 4.0 },
  { month: 7, revenue: 47_900, occupancyPct: 82, bookings: 52, avgStayNights: 4.4 },
  { month: 8, revenue: 49_600, occupancyPct: 85, bookings: 54, avgStayNights: 4.4 },
  { month: 9, revenue: 36_609, occupancyPct: 67, bookings: 50, avgStayNights: 3.4 },
  { month: 10, revenue: 24_000, occupancyPct: 51, bookings: 44, avgStayNights: 3.2 },
  { month: 11, revenue: 11_700, occupancyPct: 28, bookings: 27, avgStayNights: 2.8 },
  { month: 12, revenue: 15_800, occupancyPct: 35, bookings: 29, avgStayNights: 3.4 },
];
