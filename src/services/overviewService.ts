import type { PropertyOverviewKpis, ReservationStatus, Reservation, Unit } from "@/types";
import { addDays, daysInMonth, isoDate, parseIsoDate } from "@/lib/dates";
import { MOCK_TODAY } from "@/lib/config";
import {
  arrivalsInRange,
  averageStayNights,
  departuresInRange,
  occupancyPct,
  statusOnDate,
  unitsWithStatusOnDate,
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

const ARRIVALS_DEPARTURES_WINDOW_DAYS = 7;

export interface ArrivalDepartureDay {
  date: string;
  /** Number of units affected, not raw reservation count (kept identical here, but future
   *  data sources may report split-stay reservations differently). */
  units: number;
}

export interface ArrivalsDeparturesSummary {
  range: DateRange;
  arrivalsCount: number;
  departuresCount: number;
  /** Only dates with at least one arrival, in chronological order. */
  arrivalDays: ArrivalDepartureDay[];
  /** Only dates with at least one departure, in chronological order. */
  departureDays: ArrivalDepartureDay[];
}

export async function getArrivalsDeparturesSummary(
  propertyId: string
): Promise<ArrivalsDeparturesSummary> {
  const range: DateRange = {
    start: MOCK_TODAY,
    endExclusive: addDays(MOCK_TODAY, ARRIVALS_DEPARTURES_WINDOW_DAYS),
  };
  const reservations = await getReservationsForProperty(propertyId, range);
  const arrivals = arrivalsInRange(reservations, propertyId, range);
  const departures = departuresInRange(reservations, propertyId, range);

  const arrivalDays: ArrivalDepartureDay[] = [];
  const departureDays: ArrivalDepartureDay[] = [];
  for (let i = 0; i < ARRIVALS_DEPARTURES_WINDOW_DAYS; i += 1) {
    const date = addDays(range.start, i);
    const arrivalUnits = new Set(
      arrivals.filter((reservation) => reservation.checkIn === date).map((r) => r.unitId)
    );
    const departureUnits = new Set(
      departures.filter((reservation) => reservation.checkOut === date).map((r) => r.unitId)
    );
    if (arrivalUnits.size > 0) arrivalDays.push({ date, units: arrivalUnits.size });
    if (departureUnits.size > 0) departureDays.push({ date, units: departureUnits.size });
  }

  return {
    range,
    arrivalsCount: arrivals.length,
    departuresCount: departures.length,
    arrivalDays,
    departureDays,
  };
}

export interface TodayStatus {
  date: string;
  occupiedUnits: number;
  totalUnits: number;
  arrivals: number;
  departures: number;
}

export async function getTodayStatus(propertyId: string): Promise<TodayStatus> {
  const units = await getUnitsForProperty(propertyId);
  const range: DateRange = { start: MOCK_TODAY, endExclusive: addDays(MOCK_TODAY, 1) };
  const reservations = await getReservationsForProperty(propertyId, range);

  return {
    date: MOCK_TODAY,
    occupiedUnits: unitsWithStatusOnDate(reservations, units, MOCK_TODAY).length,
    totalUnits: units.length,
    arrivals: arrivalsInRange(reservations, propertyId, range).length,
    departures: departuresInRange(reservations, propertyId, range).length,
  };
}

export interface UnitStatusEntry {
  unit: Unit;
  status: ReservationStatus | "free";
}

export interface UnitStatusOverview {
  entries: UnitStatusEntry[];
  counts: { occupied: number; free: number; ownerUse: number; blocked: number };
}

export async function getUnitStatusOverview(propertyId: string): Promise<UnitStatusOverview> {
  const units = await getUnitsForProperty(propertyId);
  const range: DateRange = { start: MOCK_TODAY, endExclusive: addDays(MOCK_TODAY, 1) };
  const reservations = await getReservationsForProperty(propertyId, range);

  const entries: UnitStatusEntry[] = units.map((unit) => ({
    unit,
    status: statusOnDate(reservations, unit.id, MOCK_TODAY),
  }));

  const counts = entries.reduce(
    (acc, entry) => {
      if (entry.status === "confirmed") acc.occupied += 1;
      else if (entry.status === "free") acc.free += 1;
      else if (entry.status === "owner-use") acc.ownerUse += 1;
      else if (entry.status === "blocked") acc.blocked += 1;
      return acc;
    },
    { occupied: 0, free: 0, ownerUse: 0, blocked: 0 }
  );

  return { entries, counts };
}
