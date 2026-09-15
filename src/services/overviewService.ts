import type { PropertyOverviewKpis, ReservationStatus, Reservation, Unit } from "@/types";
import { addDays, isoDate, parseIsoDate, sameDayCountRangeEnd, startOfMonth } from "@/lib/dates";
import { ownerPortalToday } from "@/server/services/ownerPortal/today";
import {
  arrivalsInRange,
  calculateAverageStay,
  calculateBookingCount,
  calculateOccupancy,
  calculatePeriodRevenue,
  departuresInRange,
  nightsOfStatusInRange,
  reservationsInRange,
  statusOnDate,
  unitsWithStatusOnDate,
  type DateRange,
} from "@/lib/occupancy";
import { getUnitsForProperty } from "./unitService";
import { getReservationsForProperty } from "./reservationService";

const PREVIEW_WINDOW_DAYS = 14;

/**
 * "mtd" (Month to Date, 1st of the current month through today inclusive) is
 * the Übersicht page's default and only "this month" view - unlike the
 * Statistiken page there's no historical month picker here, so there's no
 * separate "full current month" option to keep alongside it (a full,
 * still-incomplete current month would just be a second, more misleading
 * way to show the same "this month" concept - see statisticsService.ts's
 * identical "mtd"/"ytd bis heute" reasoning). "year" is unchanged: the full
 * calendar year, including already-booked future reservations.
 */
export type OverviewPeriod = "mtd" | "year";

/**
 * The current- and previous-year DateRanges for one period - mirrors
 * services/statisticsService.ts#periodRanges (same "mtd ends at today,
 * previous year matched by exact day count" rule; see
 * lib/dates.ts#sameDayCountRangeEnd for the shared arithmetic).
 */
function overviewPeriodRanges(period: OverviewPeriod, today: string): { currentRange: DateRange; previousRange: DateRange } {
  const todayDate = parseIsoDate(today);
  const year = todayDate.getUTCFullYear();
  const month = todayDate.getUTCMonth() + 1;

  if (period === "year") {
    const start = isoDate(year, 1, 1);
    const endExclusive = isoDate(year + 1, 1, 1);
    const previousStart = isoDate(year - 1, 1, 1);
    return {
      currentRange: { start, endExclusive },
      previousRange: { start: previousStart, endExclusive: isoDate(year, 1, 1) },
    };
  }

  const start = startOfMonth(today);
  const endExclusive = addDays(today, 1);
  const previousStart = isoDate(year - 1, month, 1);
  return {
    currentRange: { start, endExclusive },
    previousRange: { start: previousStart, endExclusive: sameDayCountRangeEnd(start, endExclusive, previousStart) },
  };
}

interface PeriodKpis {
  occupancyPct: number;
  revenue: number;
  bookingsCount: number;
  avgStayNights: number;
  /** Whether any reservation (any status) touched this range at all - see PropertyOverviewKpis.previousYearAvailable. */
  hasData: boolean;
}

async function kpisForRange(propertyId: string, units: Unit[], range: DateRange): Promise<PeriodKpis> {
  const reservations = await getReservationsForProperty(propertyId, range);
  const scoped = reservationsInRange(reservations, propertyId, range);

  const occupiedNights = nightsOfStatusInRange(reservations, range, ["confirmed"]);
  const availableNights = units.length * (parseIsoDate(range.endExclusive).getTime() - parseIsoDate(range.start).getTime()) / 86_400_000;

  return {
    occupancyPct: calculateOccupancy(occupiedNights, availableNights),
    revenue: calculatePeriodRevenue(scoped, range),
    bookingsCount: calculateBookingCount(scoped),
    avgStayNights: calculateAverageStay(scoped),
    hasData: scoped.length > 0,
  };
}

export async function getPropertyOverviewKpis(
  propertyId: string,
  period: OverviewPeriod = "mtd"
): Promise<PropertyOverviewKpis> {
  const today = ownerPortalToday();
  const units = await getUnitsForProperty(propertyId);
  const { currentRange, previousRange } = overviewPeriodRanges(period, today);

  const [current, previous] = await Promise.all([
    kpisForRange(propertyId, units, currentRange),
    kpisForRange(propertyId, units, previousRange),
  ]);

  return {
    occupancyPct: current.occupancyPct,
    occupancyPctPreviousYear: previous.occupancyPct,
    revenue: current.revenue,
    revenuePreviousYear: previous.revenue,
    bookingsCount: current.bookingsCount,
    bookingsCountPreviousYear: previous.bookingsCount,
    avgStayNights: current.avgStayNights,
    avgStayNightsPreviousYear: previous.avgStayNights,
    // Every KPI card compares against the same previous-year period, so
    // whether that comparison is even meaningful is a single, shared signal
    // - mirrors statisticsService.ts's identical previousYearAvailable.
    previousYearAvailable: previous.hasData,
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
  const today = ownerPortalToday();
  const units = await getUnitsForProperty(propertyId);
  const range: DateRange = {
    start: today,
    endExclusive: addDays(today, PREVIEW_WINDOW_DAYS),
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
  const today = ownerPortalToday();
  const range: DateRange = {
    start: today,
    endExclusive: addDays(today, ARRIVALS_DEPARTURES_WINDOW_DAYS),
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
  const today = ownerPortalToday();
  const units = await getUnitsForProperty(propertyId);
  const range: DateRange = { start: today, endExclusive: addDays(today, 1) };
  const reservations = await getReservationsForProperty(propertyId, range);

  return {
    date: today,
    occupiedUnits: unitsWithStatusOnDate(reservations, units, today).length,
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
  const today = ownerPortalToday();
  const units = await getUnitsForProperty(propertyId);
  const range: DateRange = { start: today, endExclusive: addDays(today, 1) };
  const reservations = await getReservationsForProperty(propertyId, range);

  const entries: UnitStatusEntry[] = units.map((unit) => ({
    unit,
    status: statusOnDate(reservations, unit.id, today),
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
