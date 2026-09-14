import type { BookingSourceBreakdown, ComparableMetric, PropertyStatistics, Reservation, UnitStatistics } from "@/types";
import { addDays, daysInMonth, isoDate, monthLabel, parseIsoDate } from "@/lib/dates";
import { createTranslator, getDictionary, type Locale } from "@/i18n";
import {
  arrivalsInRange,
  calculateADR,
  calculateAverageStay,
  calculateBookingCount,
  calculateBookingRevenue,
  calculateOccupancy,
  calculateRevPAR,
  nightsOfStatusInRange,
  reservationsInRange,
  type DateRange,
} from "@/lib/occupancy";
import { isApaleoConfigured } from "@/server/integrations/apaleo/config";
import { ownerPortalToday } from "@/server/services/ownerPortal/today";
import {
  MONTHLY_SERIES_2025,
  MONTHLY_SERIES_2026,
  UNIT_COUNT,
  type MonthlyMockPoint,
} from "@/data/mock/statisticsSeries";
import { computeBookingSourceBreakdown } from "@/data/mock/bookingChannels";
import { getPropertyOverviewKpis } from "./overviewService";
import { getUnitsForProperty } from "./unitService";
import { getReservationsForProperty } from "./reservationService";

/** The Statistiken page's own period filter - a superset of the Übersicht
 *  page's "month"/"year" that also offers a year-to-date view. */
export type StatisticsPeriod = "month" | "ytd" | "year";

/**
 * Illustrative figures with no live apaleo source in V1 (owner proceeds,
 * booking lead time, cancellation rate are all on the explicit "not
 * required live yet" list) - kept as named, clearly-labelled constants
 * rather than blended silently into otherwise-live numbers.
 */
const OWNER_PAYOUT_RATE = 0.65;
const MOCK_AVG_LEAD_TIME_DAYS: Record<StatisticsPeriod, number> = { month: 32, ytd: 29, year: 27 };
const MOCK_CANCELLATION_PCT: Record<StatisticsPeriod, number> = { month: 4.8, ytd: 5.2, year: 5.5 };

function metric(value: number, previousYear: number): ComparableMetric {
  return { value, previousYear };
}

function monthsForPeriod(period: StatisticsPeriod, currentMonth: number): number[] {
  if (period === "month") return [currentMonth];
  if (period === "ytd") return Array.from({ length: currentMonth }, (_, i) => i + 1);
  return Array.from({ length: 12 }, (_, i) => i + 1);
}

function periodLabelFor(period: StatisticsPeriod, year: number, month: number, locale: Locale): string {
  if (period === "year") return createTranslator(getDictionary(locale))("overview.year", { year });
  if (period === "ytd") return `YTD ${year}`;
  return `${monthLabel(month, locale)} ${year}`;
}

export async function getPropertyStatistics(
  propertyId: string,
  period: StatisticsPeriod = "month",
  locale: Locale = "de"
): Promise<PropertyStatistics> {
  return isApaleoConfigured()
    ? getLivePropertyStatistics(propertyId, period, locale)
    : getMockPropertyStatistics(propertyId, period, locale);
}

// ---------------------------------------------------------------------------
// Live apaleo path
// ---------------------------------------------------------------------------

interface PeriodMetrics {
  occupancyPct: number;
  revenue: number;
  adr: number;
  revPar: number;
  bookingsCount: number;
  avgStayNights: number;
  avgBookingValue: number;
}

/**
 * Belegung/Buchungen/Buchungsumsatz/Ø Aufenthaltsdauer for one range, all
 * stay-overlap based (a reservation counts if its stay touches the range) -
 * the "prefer overlap for performance/stay KPIs" rule from the spec. Safe
 * for a single headline range; the 12-bucket monthly trend series below
 * uses arrival-date attribution instead so adjoining month buckets never
 * double-count a stay that crosses a month boundary.
 */
function metricsForRange(reservations: Reservation[], propertyId: string, unitCount: number, range: DateRange): PeriodMetrics {
  const scoped = reservationsInRange(reservations, propertyId, range);
  const occupiedNights = nightsOfStatusInRange(reservations, range, ["confirmed"]);
  const rangeDays = (parseIsoDate(range.endExclusive).getTime() - parseIsoDate(range.start).getTime()) / 86_400_000;
  const availableNights = unitCount * rangeDays;
  const revenue = calculateBookingRevenue(scoped);
  const bookingsCount = calculateBookingCount(scoped);
  const avgStayNights = calculateAverageStay(scoped);

  return {
    occupancyPct: calculateOccupancy(occupiedNights, availableNights),
    revenue,
    adr: calculateADR(revenue, occupiedNights),
    revPar: calculateRevPAR(revenue, availableNights),
    bookingsCount,
    avgStayNights,
    avgBookingValue: bookingsCount > 0 ? revenue / bookingsCount : 0,
  };
}

/** Monthly revenue series, attributed by arrival date - see metricsForRange's doc comment for why this differs from the headline KPI's overlap basis. */
function monthlyRevenueSeries(reservations: Reservation[], propertyId: string, year: number) {
  return Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const start = isoDate(year, month, 1);
    const range: DateRange = { start, endExclusive: addDays(start, daysInMonth(year, month)) };
    const arrivals = arrivalsInRange(reservations, propertyId, range).filter((r) => r.status === "confirmed");
    return { month, year, revenue: calculateBookingRevenue(arrivals) };
  });
}

function monthlyOccupancySeries(reservations: Reservation[], unitCount: number, year: number) {
  return Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const start = isoDate(year, month, 1);
    const range: DateRange = { start, endExclusive: addDays(start, daysInMonth(year, month)) };
    const occupiedNights = nightsOfStatusInRange(reservations, range, ["confirmed"]);
    const availableNights = unitCount * daysInMonth(year, month);
    return { month, year, occupancyPct: calculateOccupancy(occupiedNights, availableNights) };
  });
}

const CHANNEL_LABELS: Record<BookingSourceBreakdown["source"], string> = {
  direct: "Direktbuchungen",
  booking_com: "Booking.com",
  airbnb: "Airbnb",
  other: "Sonstige",
};

/** Channel Mix from each reservation's already-classified `channel` field (see ownerPortal/reservations.ts) - arrival-date attributed, same reasoning as the revenue trend series. */
function liveBookingSourceBreakdown(reservations: Reservation[], propertyId: string, range: DateRange): BookingSourceBreakdown[] {
  const arrivals = arrivalsInRange(reservations, propertyId, range).filter((r) => r.status === "confirmed");
  const totals = new Map<BookingSourceBreakdown["source"], { revenue: number; bookingCount: number }>(
    (Object.keys(CHANNEL_LABELS) as BookingSourceBreakdown["source"][]).map((source) => [source, { revenue: 0, bookingCount: 0 }])
  );

  let totalRevenue = 0;
  for (const reservation of arrivals) {
    const source = reservation.channel ?? "other";
    const bucket = totals.get(source)!;
    bucket.revenue += reservation.accommodationAmount;
    bucket.bookingCount += 1;
    totalRevenue += reservation.accommodationAmount;
  }

  return (Object.keys(CHANNEL_LABELS) as BookingSourceBreakdown["source"][]).map((source) => {
    const bucket = totals.get(source)!;
    return {
      source,
      label: CHANNEL_LABELS[source],
      revenue: bucket.revenue,
      bookingCount: bucket.bookingCount,
      revenueShare: totalRevenue > 0 ? (bucket.revenue / totalRevenue) * 100 : 0,
    };
  });
}

async function getLiveUnitPerformance(
  propertyId: string,
  reservations: Reservation[],
  range: DateRange
): Promise<UnitStatistics[]> {
  const units = await getUnitsForProperty(propertyId);
  const rangeDays = (parseIsoDate(range.endExclusive).getTime() - parseIsoDate(range.start).getTime()) / 86_400_000;

  return units.map((unit) => {
    const unitReservations = reservationsInRange(
      reservations.filter((r) => r.unitId === unit.id),
      propertyId,
      range
    );
    const confirmed = unitReservations.filter((r) => r.status === "confirmed");
    const revenue = calculateBookingRevenue(confirmed);
    const occupiedNights = nightsOfStatusInRange(unitReservations, range, ["confirmed"]);
    const occupied = calculateOccupancy(occupiedNights, rangeDays);

    return {
      unitId: unit.id,
      occupancyPct: occupied,
      revenue,
      adr: calculateADR(revenue, occupiedNights),
      revPar: calculateRevPAR(revenue, rangeDays),
      bookings: confirmed.length,
      avgStayNights: calculateAverageStay(confirmed),
    } satisfies UnitStatistics;
  });
}

async function getLivePropertyStatistics(
  propertyId: string,
  period: StatisticsPeriod,
  locale: Locale
): Promise<PropertyStatistics> {
  const today = ownerPortalToday();
  const todayDate = parseIsoDate(today);
  const year = todayDate.getUTCFullYear();
  const month = todayDate.getUTCMonth() + 1;
  const months = monthsForPeriod(period, month);

  const units = await getUnitsForProperty(propertyId);
  const yearRange: DateRange = { start: isoDate(year, 1, 1), endExclusive: isoDate(year + 1, 1, 1) };
  const previousYearRange: DateRange = { start: isoDate(year - 1, 1, 1), endExclusive: isoDate(year, 1, 1) };

  const [currentYearReservations, previousYearReservations] = await Promise.all([
    getReservationsForProperty(propertyId, yearRange),
    getReservationsForProperty(propertyId, previousYearRange),
  ]);

  const firstMonth = months[0];
  const lastMonth = months[months.length - 1];
  const currentRange: DateRange = {
    start: isoDate(year, firstMonth, 1),
    endExclusive: addDays(isoDate(year, lastMonth, 1), daysInMonth(year, lastMonth)),
  };
  const previousRange: DateRange = {
    start: isoDate(year - 1, firstMonth, 1),
    endExclusive: addDays(isoDate(year - 1, lastMonth, 1), daysInMonth(year - 1, lastMonth)),
  };

  const current = metricsForRange(currentYearReservations, propertyId, units.length, currentRange);
  const previous = metricsForRange(previousYearReservations, propertyId, units.length, previousRange);

  const unitStats = await getLiveUnitPerformance(propertyId, currentYearReservations, currentRange);
  const bookingSources = liveBookingSourceBreakdown(currentYearReservations, propertyId, currentRange);

  return {
    propertyId,
    periodLabel: periodLabelFor(period, year, month, locale),
    comparisonLabel: getDictionary(locale).statistics.previousYearLabel,
    occupancyPct: metric(current.occupancyPct, previous.occupancyPct),
    revenue: metric(current.revenue, previous.revenue),
    adr: metric(current.adr, previous.adr),
    revPar: metric(current.revPar, previous.revPar),
    bookingsCount: metric(current.bookingsCount, previous.bookingsCount),
    avgStayNights: metric(current.avgStayNights, previous.avgStayNights),
    avgBookingValue: metric(current.avgBookingValue, previous.avgBookingValue),
    ownerPayout: metric(current.revenue * OWNER_PAYOUT_RATE, previous.revenue * OWNER_PAYOUT_RATE),
    monthlyRevenue: [
      ...monthlyRevenueSeries(currentYearReservations, propertyId, year),
      ...monthlyRevenueSeries(previousYearReservations, propertyId, year - 1),
    ],
    monthlyOccupancy: [
      ...monthlyOccupancySeries(currentYearReservations, units.length, year),
      ...monthlyOccupancySeries(previousYearReservations, units.length, year - 1),
    ],
    unitStats,
    unitStatsPeriodLabel: periodLabelFor(period, year, month, locale),
    bookingSources,
    avgLeadTimeDays: MOCK_AVG_LEAD_TIME_DAYS[period],
    cancellationRatePct: MOCK_CANCELLATION_PCT[period],
  };
}

// ---------------------------------------------------------------------------
// Mock fallback path (apaleo not configured) - unchanged V1 behaviour.
// ---------------------------------------------------------------------------

const REPORTING_YEAR = parseIsoDate(ownerPortalToday()).getUTCFullYear();
const REPORTING_MONTH = parseIsoDate(ownerPortalToday()).getUTCMonth() + 1;

interface Aggregate {
  revenue: number;
  occupiedNights: number;
  availableNights: number;
  bookings: number;
  stayNightsTotal: number;
}

const EMPTY_AGGREGATE: Aggregate = {
  revenue: 0,
  occupiedNights: 0,
  availableNights: 0,
  bookings: 0,
  stayNightsTotal: 0,
};

function aggregateMonths(series: MonthlyMockPoint[], year: number, months: number[]): Aggregate {
  return months.reduce<Aggregate>((acc, month) => {
    const point = series[month - 1];
    const days = daysInMonth(year, month);
    const available = UNIT_COUNT * days;
    const occupied = (point.occupancyPct / 100) * available;
    return {
      revenue: acc.revenue + point.revenue,
      occupiedNights: acc.occupiedNights + occupied,
      availableNights: acc.availableNights + available,
      bookings: acc.bookings + point.bookings,
      stayNightsTotal: acc.stayNightsTotal + point.bookings * point.avgStayNights,
    };
  }, EMPTY_AGGREGATE);
}

function metricsFromAggregate(a: Aggregate) {
  const adr = a.occupiedNights > 0 ? a.revenue / a.occupiedNights : 0;
  const revPar = a.availableNights > 0 ? a.revenue / a.availableNights : 0;
  const occupancy = a.availableNights > 0 ? (a.occupiedNights / a.availableNights) * 100 : 0;
  const avgStay = a.bookings > 0 ? a.stayNightsTotal / a.bookings : 0;
  const avgBookingValue = a.bookings > 0 ? a.revenue / a.bookings : 0;
  return { adr, revPar, occupancy, avgStay, avgBookingValue };
}

async function getMockPropertyStatistics(
  propertyId: string,
  period: StatisticsPeriod,
  locale: Locale
): Promise<PropertyStatistics> {
  const months = monthsForPeriod(period, REPORTING_MONTH);
  const currentAgg = aggregateMonths(MONTHLY_SERIES_2026, REPORTING_YEAR, months);
  const previousAgg = aggregateMonths(MONTHLY_SERIES_2025, REPORTING_YEAR - 1, months);

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

  const unitStats = await getMockUnitPerformance(propertyId);
  const bookingSources = computeBookingSourceBreakdown(currentAgg.revenue, currentAgg.bookings);

  return {
    propertyId,
    periodLabel: periodLabelFor(period, REPORTING_YEAR, REPORTING_MONTH, locale),
    comparisonLabel: getDictionary(locale).statistics.previousYearLabel,
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
    unitStatsPeriodLabel: `${monthLabel(REPORTING_MONTH, locale)} ${REPORTING_YEAR}`,
    bookingSources,
    avgLeadTimeDays: MOCK_AVG_LEAD_TIME_DAYS[period],
    cancellationRatePct: MOCK_CANCELLATION_PCT[period],
  };
}

/**
 * Per-unit performance, always reported for the current mock reporting month
 * regardless of the page-level period filter: it is derived from the real
 * day-level reservation mock data, which only covers that window, so a
 * "full year" per-unit breakdown would be mostly empty rather than
 * genuinely informative.
 */
async function getMockUnitPerformance(propertyId: string): Promise<UnitStatistics[]> {
  const units = await getUnitsForProperty(propertyId);
  const days = daysInMonth(REPORTING_YEAR, REPORTING_MONTH);
  const monthStart = isoDate(REPORTING_YEAR, REPORTING_MONTH, 1);
  const range: DateRange = { start: monthStart, endExclusive: addDays(monthStart, days) };
  const reservations = await getReservationsForProperty(propertyId, range);

  return units.map((unit) => {
    const unitReservations = reservations.filter((reservation) => reservation.unitId === unit.id);
    const confirmed = unitReservations.filter((reservation) => reservation.status === "confirmed");
    const revenue = calculateBookingRevenue(confirmed);
    const occupied = calculateOccupancy(nightsOfStatusInRange(unitReservations, range, ["confirmed"]), days);
    const occupiedNights = (occupied / 100) * days;

    return {
      unitId: unit.id,
      occupancyPct: occupied,
      revenue,
      adr: occupiedNights > 0 ? revenue / occupiedNights : 0,
      revPar: days > 0 ? revenue / days : 0,
      bookings: confirmed.length,
      avgStayNights: calculateAverageStay(unitReservations),
    } satisfies UnitStatistics;
  });
}
