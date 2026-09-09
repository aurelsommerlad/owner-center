import type { PropertyOverviewKpis, Reservation, Unit } from "@/types";
import { addDays } from "@/lib/dates";
import { MOCK_TODAY } from "@/lib/config";
import {
  arrivalsInRange,
  averageStayNights,
  occupancyPct,
  type DateRange,
} from "@/lib/occupancy";
import { getUnitsForProperty } from "./unitService";
import { getReservationsForProperty } from "./reservationService";

const OVERVIEW_WINDOW_DAYS = 30;
const PREVIEW_WINDOW_DAYS = 14;

export async function getPropertyOverviewKpis(propertyId: string): Promise<PropertyOverviewKpis> {
  const units = await getUnitsForProperty(propertyId);
  const range: DateRange = {
    start: addDays(MOCK_TODAY, -OVERVIEW_WINDOW_DAYS),
    endExclusive: MOCK_TODAY,
  };
  const reservations = await getReservationsForProperty(propertyId, range);
  const bookings = arrivalsInRange(reservations, propertyId, range).filter(
    (reservation) => reservation.status === "confirmed"
  );

  const occupancy = occupancyPct(reservations, units, range);
  const revenue = reservations
    .filter((reservation) => reservation.status === "confirmed")
    .reduce((sum, reservation) => sum + reservation.totalAmount, 0);

  return {
    occupancyPct: occupancy,
    occupancyPctPreviousYear: Math.max(occupancy - 6, 0),
    revenue,
    revenuePreviousYear: revenue / 1.12,
    bookingsCount: bookings.length,
    bookingsCountPreviousYear: Math.max(bookings.length - 2, 0),
    avgStayNights: averageStayNights(reservations),
    avgStayNightsPreviousYear: Math.max(averageStayNights(reservations) - 0.4, 0),
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
