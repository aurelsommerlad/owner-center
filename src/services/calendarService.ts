import type { Reservation, Unit } from "@/types";
import { addDays, daysInMonth, isoDate } from "@/lib/dates";
import { MOCK_TODAY } from "@/lib/config";
import {
  arrivalsInRange,
  departuresInRange,
  freeNightsInRange,
  occupancyPct,
  unitsWithStatusOnDate,
  type DateRange,
} from "@/lib/occupancy";
import { getUnitsForProperty } from "./unitService";
import { getReservationsForProperty } from "./reservationService";

export interface CalendarDay {
  date: string;
}

export interface CalendarRow {
  unit: Unit;
  reservations: Reservation[];
}

export interface CalendarStats {
  occupancyPct: number;
  unitsOccupiedToday: number;
  unitsTotal: number;
  arrivalsNext7Days: number;
  departuresNext7Days: number;
  freeNights: number;
}

export interface CalendarMonth {
  year: number;
  month: number;
  range: DateRange;
  days: CalendarDay[];
  rows: CalendarRow[];
  stats: CalendarStats;
}

export async function getCalendarMonth(
  propertyId: string,
  year: number,
  month: number,
  unitId?: string
): Promise<CalendarMonth> {
  const allUnits = await getUnitsForProperty(propertyId);
  const units = unitId ? allUnits.filter((unit) => unit.id === unitId) : allUnits;

  const start = isoDate(year, month, 1);
  const endExclusive = addDays(start, daysInMonth(year, month));
  const range: DateRange = { start, endExclusive };

  const reservations = await getReservationsForProperty(propertyId, range);
  const scopedReservations = unitId
    ? reservations.filter((reservation) => reservation.unitId === unitId)
    : reservations;

  const days: CalendarDay[] = Array.from({ length: daysInMonth(year, month) }, (_, index) => ({
    date: addDays(start, index),
  }));

  const rows: CalendarRow[] = units.map((unit) => ({
    unit,
    reservations: scopedReservations.filter((reservation) => reservation.unitId === unit.id),
  }));

  const next7Days: DateRange = { start: MOCK_TODAY, endExclusive: addDays(MOCK_TODAY, 7) };

  const stats: CalendarStats = {
    occupancyPct: occupancyPct(scopedReservations, units, range),
    unitsOccupiedToday: unitsWithStatusOnDate(scopedReservations, units, MOCK_TODAY).length,
    unitsTotal: units.length,
    arrivalsNext7Days: arrivalsInRange(scopedReservations, propertyId, next7Days).length,
    departuresNext7Days: departuresInRange(scopedReservations, propertyId, next7Days).length,
    freeNights: freeNightsInRange(scopedReservations, units, range),
  };

  return { year, month, range, days, rows, stats };
}
