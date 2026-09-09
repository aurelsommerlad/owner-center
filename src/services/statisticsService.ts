import type { ComparableMetric, PropertyStatistics, UnitStatistics } from "@/types";
import { addDays, daysInMonth, isoDate, monthLabel, parseIsoDate } from "@/lib/dates";
import { MOCK_TODAY } from "@/lib/config";
import { averageStayNights, occupancyPct, type DateRange } from "@/lib/occupancy";
import {
  MONTHLY_SERIES_2025,
  MONTHLY_SERIES_2026,
  UNIT_COUNT,
  type MonthlyMockPoint,
} from "@/data/mock/statisticsSeries";
import { getPropertyOverviewKpis, type OverviewPeriod } from "./overviewService";
import { getUnitsForProperty } from "./unitService";
import { getReservationsForProperty } from "./reservationService";

/** Illustrative owner payout ratio (revenue share after management commission). */
const OWNER_PAYOUT_RATE = 0.65;

const REPORTING_YEAR = parseIsoDate(MOCK_TODAY).getUTCFullYear();
const REPORTING_MONTH = parseIsoDate(MOCK_TODAY).getUTCMonth() + 1;

interface Aggregate {
  revenue: number;
  occupiedNights: number;
  availableNights: number;
  bookings: number;
  stayNightsTotal: number;
}

function aggregateYear(series: MonthlyMockPoint[], year: number): Aggregate {
  return series.reduce<Aggregate>(
    (acc, point) => {
      const days = daysInMonth(year, point.month);
      const available = UNIT_COUNT * days;
      const occupied = (point.occupancyPct / 100) * available;
      return {
        revenue: acc.revenue + point.revenue,
        occupiedNights: acc.occupiedNights + occupied,
        availableNights: acc.availableNights + available,
        bookings: acc.bookings + point.bookings,
        stayNightsTotal: acc.stayNightsTotal + point.bookings * point.avgStayNights,
      };
    },
    { revenue: 0, occupiedNights: 0, availableNights: 0, bookings: 0, stayNightsTotal: 0 }
  );
}

function aggregateMonth(point: MonthlyMockPoint, year: number): Aggregate {
  const days = daysInMonth(year, point.month);
  const available = UNIT_COUNT * days;
  const occupied = (point.occupancyPct / 100) * available;
  return {
    revenue: point.revenue,
    occupiedNights: occupied,
    availableNights: available,
    bookings: point.bookings,
    stayNightsTotal: point.bookings * point.avgStayNights,
  };
}

function metricsFromAggregate(a: Aggregate) {
  const adr = a.occupiedNights > 0 ? a.revenue / a.occupiedNights : 0;
  const revPar = a.availableNights > 0 ? a.revenue / a.availableNights : 0;
  const occupancy = a.availableNights > 0 ? (a.occupiedNights / a.availableNights) * 100 : 0;
  const avgStay = a.bookings > 0 ? a.stayNightsTotal / a.bookings : 0;
  const avgBookingValue = a.bookings > 0 ? a.revenue / a.bookings : 0;
  return { adr, revPar, occupancy, avgStay, avgBookingValue };
}

function metric(value: number, previousYear: number): ComparableMetric {
  return { value, previousYear };
}

export async function getPropertyStatistics(
  propertyId: string,
  period: OverviewPeriod = "month"
): Promise<PropertyStatistics> {
  const currentAgg =
    period === "year"
      ? aggregateYear(MONTHLY_SERIES_2026, REPORTING_YEAR)
      : aggregateMonth(MONTHLY_SERIES_2026[REPORTING_MONTH - 1], REPORTING_YEAR);
  const previousAgg =
    period === "year"
      ? aggregateYear(MONTHLY_SERIES_2025, REPORTING_YEAR - 1)
      : aggregateMonth(MONTHLY_SERIES_2025[REPORTING_MONTH - 1], REPORTING_YEAR - 1);

  // The current month is also driven by real (mock) reservations elsewhere in
  // the app (Übersicht page) - splice that live figure in so both pages agree
  // on September 2026 exactly, instead of two independently-authored numbers.
  if (period === "month") {
    const liveKpis = await getPropertyOverviewKpis(propertyId, "month");
    currentAgg.revenue = liveKpis.revenue;
    currentAgg.bookings = liveKpis.bookingsCount;
    currentAgg.stayNightsTotal = liveKpis.bookingsCount * liveKpis.avgStayNights;
    currentAgg.occupiedNights = (liveKpis.occupancyPct / 100) * currentAgg.availableNights;
  }

  const current = metricsFromAggregate(currentAgg);
  const previous = metricsFromAggregate(previousAgg);

  const periodLabel =
    period === "year" ? `Jahr ${REPORTING_YEAR}` : `${monthLabel(REPORTING_MONTH)} ${REPORTING_YEAR}`;

  const unitStats = await getUnitPerformance(propertyId);

  return {
    propertyId,
    periodLabel,
    comparisonLabel: "Vorjahr",
    occupancyPct: metric(current.occupancy, previous.occupancy),
    revenue: metric(currentAgg.revenue, previousAgg.revenue),
    adr: metric(current.adr, previous.adr),
    revPar: metric(current.revPar, previous.revPar),
    bookingsCount: metric(currentAgg.bookings, previousAgg.bookings),
    avgStayNights: metric(current.avgStay, previous.avgStay),
    avgBookingValue: metric(current.avgBookingValue, previous.avgBookingValue),
    ownerPayout: metric(currentAgg.revenue * OWNER_PAYOUT_RATE, previousAgg.revenue * OWNER_PAYOUT_RATE),
    monthlyRevenue: MONTHLY_SERIES_2026.map((point) => ({
      month: point.month,
      year: REPORTING_YEAR,
      revenue: point.revenue,
    })).concat(
      MONTHLY_SERIES_2025.map((point) => ({
        month: point.month,
        year: REPORTING_YEAR - 1,
        revenue: point.revenue,
      }))
    ),
    monthlyOccupancy: MONTHLY_SERIES_2026.map((point) => ({
      month: point.month,
      year: REPORTING_YEAR,
      occupancyPct: point.occupancyPct,
    })).concat(
      MONTHLY_SERIES_2025.map((point) => ({
        month: point.month,
        year: REPORTING_YEAR - 1,
        occupancyPct: point.occupancyPct,
      }))
    ),
    unitStats,
  };
}

/**
 * Per-unit performance, always reported for the current mock reporting month
 * (September 2026) regardless of the page-level period filter: it is derived
 * from the real day-level reservation mock data, which only covers that
 * window, so a "full year" per-unit breakdown would be mostly empty rather
 * than genuinely informative.
 */
export async function getUnitPerformance(propertyId: string): Promise<UnitStatistics[]> {
  const units = await getUnitsForProperty(propertyId);
  const days = daysInMonth(REPORTING_YEAR, REPORTING_MONTH);
  const monthStart = isoDate(REPORTING_YEAR, REPORTING_MONTH, 1);
  const range: DateRange = { start: monthStart, endExclusive: addDays(monthStart, days) };
  const reservations = await getReservationsForProperty(propertyId, range);

  return units.map((unit) => {
    const unitReservations = reservations.filter((reservation) => reservation.unitId === unit.id);
    const confirmed = unitReservations.filter((reservation) => reservation.status === "confirmed");
    const revenue = confirmed.reduce((sum, reservation) => sum + reservation.totalAmount, 0);
    const occupied = occupancyPct(unitReservations, [unit], range);
    const availableNights = days;
    const occupiedNights = (occupied / 100) * availableNights;

    return {
      unitId: unit.id,
      occupancyPct: occupied,
      revenue,
      adr: occupiedNights > 0 ? revenue / occupiedNights : 0,
      revPar: availableNights > 0 ? revenue / availableNights : 0,
      bookings: confirmed.length,
      avgStayNights: averageStayNights(unitReservations),
    } satisfies UnitStatistics;
  });
}
