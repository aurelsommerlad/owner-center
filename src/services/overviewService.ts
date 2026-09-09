import type { PropertyOverviewKpis, Reservation, Unit } from "@/types";
import { addDays, daysInMonth, isoDate, parseIsoDate } from "@/lib/dates";
import { MOCK_TODAY } from "@/lib/config";
import {
  arrivalsInRange,
  averageStayNights,
  occupancyPct,
  type DateRange,
} from "@/lib/occupancy";
import { getUnitsForProperty } from "./unitService";
import { getReservationsForProperty } from "./reservationService";

const PREVIEW_WINDOW_DAYS = 14;

export type OverviewPeriod = "month" | "year";

function rangeForPeriod(period: OverviewPeriod): DateRange {
  const today = parseIsoDate(MOCK_TODAY);
  const year = today.getUTCFullYear();
  const month = today.getUTCMonth() + 1;

  if (period === "year") {
    return { start: isoDate(year, 1, 1), endExclusive: isoDate(year + 1, 1, 1) };
  }

  const start = isoDate(year, month, 1);
  return { start, endExclusive: addDays(start, daysInMonth(year, month)) };
}

export async function getPropertyOverviewKpis(
  propertyId: string,
  period: OverviewPeriod = "month"
): Promise<PropertyOverviewKpis> {
  const units = await getUnitsForProperty(propertyId);
  const range = rangeForPeriod(period);
  const reservations = await getReservationsForProperty(propertyId, range);
  const bookings = arrivalsInRange(reservations, propertyId, range).filter(
    (reservation) => reservation.status === "confirmed"
  );

  const occupancy = occupancyPct(reservations, units, range);
  const revenue = reservations
    .filter((reservation) => reservation.status === "confirmed")
    .reduce((sum, reservation) => sum + reservation.totalAmount, 0);
  const avgStay = averageStayNights(reservations);

  return {
    occupancyPct: occupancy,
    occupancyPctPreviousYear: Math.max(occupancy - 6, 0),
    revenue,
    revenuePreviousYear: revenue / 1.12,
    bookingsCount: bookings.length,
    bookingsCountPreviousYear: Math.max(bookings.length - 2, 0),
    avgStayNights: avgStay,
    avgStayNightsPreviousYear: Math.max(avgStay - 0.4, 0),
  };
}

export interface OccupancyPreviewDay {
  date: string;
}

export interface OccupancyPreviewRow {
  unit: Unit;
  reservations: Reservation[];
}

export interface OccupancyPreview {
  range: DateRange;
  days: OccupancyPreviewDay[];
  rows: OccupancyPreviewRow[];
}

export async function getOccupancyPreview(propertyId: string): Promise<OccupancyPreview> {
  const units = await getUnitsForProperty(propertyId);
  const range: DateRange = {
    start: MOCK_TODAY,
    endExclusive: addDays(MOCK_TODAY, PREVIEW_WINDOW_DAYS),
  };
  const reservations = await getReservationsForProperty(propertyId, range);

  const days: OccupancyPreviewDay[] = Array.from({ length: PREVIEW_WINDOW_DAYS }, (_, index) => ({
    date: addDays(range.start, index),
  }));

  const rows: OccupancyPreviewRow[] = units.map((unit) => ({
    unit,
    reservations: reservations.filter((reservation) => reservation.unitId === unit.id),
  }));

  return { range, days, rows };
}
