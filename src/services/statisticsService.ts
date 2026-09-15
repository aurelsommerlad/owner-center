import type { BookingSourceBreakdown, ComparableMetric, PropertyStatistics, Reservation, UnitStatistics } from "@/types";
import { addDays, daysInMonth, isoDate, monthLabel, parseIsoDate } from "@/lib/dates";
import { createTranslator, getDictionary, type Locale } from "@/i18n";
import {
  calculateADR,
  calculateAverageLeadTime,
  calculateAverageStay,
  calculateBookingCount,
  calculateOccupancy,
  calculatePeriodRevenue,
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

/** One selectable month in the Statistiken page's month dropdown. */
export interface StatisticsMonthOption {
  year: number;
  /** 1-12 */
  month: number;
}

/**
 * The months offered in the Statistiken page's month dropdown: a trailing
 * window ending at (and including) the current month, newest first, never
 * reaching into the future. Deliberately a fixed window rather than a
 * per-property "earliest apaleo data" lookup (no reliable, cheap signal for
 * that exists) - `windowMonths` bounds how far back it reaches; the mock
 * fallback's own fixture data (see data/mock/statisticsSeries.ts) happens to
 * cover exactly this same two-year span.
 */
export function recentStatisticsMonths(today: string, windowMonths = 24): StatisticsMonthOption[] {
  const todayDate = parseIsoDate(today);
  let year = todayDate.getUTCFullYear();
  let month = todayDate.getUTCMonth() + 1;

  return Array.from({ length: windowMonths }, () => {
    const option = { year, month };
    month -= 1;
    if (month === 0) {
      month = 12;
      year -= 1;
    }
    return option;
  });
}

/**
 * Illustrative Ø-Buchungsvorlauf figure for the mock-fallback path only
 * (apaleo not configured, local dev without credentials) - the live path
 * below computes a real value from apaleo's `created` field instead (see
 * lib/occupancy.ts#calculateAverageLeadTime). Never used together with live
 * data. Stornierungsquote/cancellationRatePct was removed entirely (both
 * live and mock): apaleo drops cancelled/no-show reservations before they
 * ever reach this app's data (see
 * integrations/apaleo/reservationService.ts#listApaleoReservationsForProperty),
 * and there is no single, already-established definition for which window
 * a cancellation rate should use - showing one would mean inventing a KPI
 * definition rather than reporting a real one.
 */
const MOCK_AVG_LEAD_TIME_DAYS: Record<StatisticsPeriod, number> = { month: 32, ytd: 29, year: 27 };

function metric(value: number, previousYear: number, previousYearAvailable: boolean): ComparableMetric {
  return { value, previousYear, previousYearAvailable };
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
  locale: Locale = "de",
  /** A specific past (or current) month from the dropdown - only meaningful when `period === "month"`; omitted/ignored otherwise, and defaults to the current month when `period === "month"` but nothing was selected. */
  selectedMonth?: StatisticsMonthOption
): Promise<PropertyStatistics> {
  return isApaleoConfigured()
    ? getLivePropertyStatistics(propertyId, period, locale, selectedMonth)
    : getMockPropertyStatistics(propertyId, period, locale, selectedMonth);
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
  /** Ø Buchungsvorlauf, real apaleo-derived (see calculateAverageLeadTime) - unlike the other fields here, never compared against a previous year (matches PropertyStatistics.avgLeadTimeDays being a bare number, not a ComparableMetric). */
  avgLeadTimeDays: number;
  /** Whether apaleo returned any reservation (any status) touching this range at all - see ComparableMetric.previousYearAvailable. */
  hasData: boolean;
}

/**
 * Belegung/Buchungen/Ø Aufenthaltsdauer for one range are stay-overlap based
 * (a reservation counts if its stay touches the range) - the "prefer
 * overlap for performance/stay KPIs" rule from the spec. Buchungsumsatz is
 * the one exception: it's night-clipped (see calculatePeriodRevenue) so a
 * stay crossing the range's boundary only contributes the nights actually
 * inside it, not its whole-stay total.
 */
function metricsForRange(reservations: Reservation[], propertyId: string, unitCount: number, range: DateRange): PeriodMetrics {
  const scoped = reservationsInRange(reservations, propertyId, range);
  const occupiedNights = nightsOfStatusInRange(reservations, range, ["confirmed"]);
  const rangeDays = (parseIsoDate(range.endExclusive).getTime() - parseIsoDate(range.start).getTime()) / 86_400_000;
  const availableNights = unitCount * rangeDays;
  const revenue = calculatePeriodRevenue(scoped, range);
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
    avgLeadTimeDays: calculateAverageLeadTime(scoped),
    hasData: scoped.length > 0,
  };
}

/** Monthly revenue series, night-clipped per bucket (see calculatePeriodRevenue) - a stay crossing a month boundary contributes to both buckets, exactly the nights each one actually covers, never double-counted. */
function monthlyRevenueSeries(reservations: Reservation[], propertyId: string, year: number) {
  return Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const start = isoDate(year, month, 1);
    const range: DateRange = { start, endExclusive: addDays(start, daysInMonth(year, month)) };
    const scoped = reservationsInRange(reservations, propertyId, range);
    return { month, year, revenue: calculatePeriodRevenue(scoped, range) };
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

/** Channel Mix from each reservation's already-classified `channel` field (see ownerPortal/reservations.ts) - stay-overlap based for the booking count (same as the headline "Buchungen" KPI), night-clipped for revenue (see calculatePeriodRevenue) so it always sums to the same total as the headline Übernachtungsumsatz KPI. */
function liveBookingSourceBreakdown(reservations: Reservation[], propertyId: string, range: DateRange): BookingSourceBreakdown[] {
  const scoped = reservationsInRange(reservations, propertyId, range).filter((r) => r.status === "confirmed");
  const totals = new Map<BookingSourceBreakdown["source"], { revenue: number; bookingCount: number }>(
    (Object.keys(CHANNEL_LABELS) as BookingSourceBreakdown["source"][]).map((source) => [source, { revenue: 0, bookingCount: 0 }])
  );

  let totalRevenue = 0;
  for (const reservation of scoped) {
    const source = reservation.channel ?? "other";
    const bucket = totals.get(source)!;
    const revenue = calculatePeriodRevenue([reservation], range);
    bucket.revenue += revenue;
    bucket.bookingCount += 1;
    totalRevenue += revenue;
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
    const revenue = calculatePeriodRevenue(confirmed, range);
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
  locale: Locale,
  selectedMonth?: StatisticsMonthOption
): Promise<PropertyStatistics> {
  const today = ownerPortalToday();
  const todayDate = parseIsoDate(today);
  // Only "month" ever anchors on something other than the current year/month
  // (a past month picked from the dropdown) - YTD/Jahr always mean "this year".
  const year = period === "month" && selectedMonth ? selectedMonth.year : todayDate.getUTCFullYear();
  const month = period === "month" && selectedMonth ? selectedMonth.month : todayDate.getUTCMonth() + 1;
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
  const currentOwnerUseNights = nightsOfStatusInRange(currentYearReservations, currentRange, ["owner-use"]);
  const previousOwnerUseNights = nightsOfStatusInRange(previousYearReservations, previousRange, ["owner-use"]);

  const unitStats = await getLiveUnitPerformance(propertyId, currentYearReservations, currentRange);
  const bookingSources = liveBookingSourceBreakdown(currentYearReservations, propertyId, currentRange);

  // Every KPI card compares against the same previous-year period, so
  // whether that comparison is even meaningful is a single, shared signal -
  // see ComparableMetric.previousYearAvailable.
  const previousYearAvailable = previous.hasData;

  return {
    propertyId,
    periodLabel: periodLabelFor(period, year, month, locale),
    comparisonLabel: getDictionary(locale).statistics.previousYearLabel,
    occupancyPct: metric(current.occupancyPct, previous.occupancyPct, previousYearAvailable),
    revenue: metric(current.revenue, previous.revenue, previousYearAvailable),
    adr: metric(current.adr, previous.adr, previousYearAvailable),
    revPar: metric(current.revPar, previous.revPar, previousYearAvailable),
    bookingsCount: metric(current.bookingsCount, previous.bookingsCount, previousYearAvailable),
    avgStayNights: metric(current.avgStayNights, previous.avgStayNights, previousYearAvailable),
    avgBookingValue: metric(current.avgBookingValue, previous.avgBookingValue, previousYearAvailable),
    ownerUseNights: metric(currentOwnerUseNights, previousOwnerUseNights, previousYearAvailable),
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
    avgLeadTimeDays: current.avgLeadTimeDays,
  };
}

// ---------------------------------------------------------------------------
// Mock fallback path (apaleo not configured) - unchanged V1 behaviour.
// ---------------------------------------------------------------------------

const REPORTING_YEAR = parseIsoDate(ownerPortalToday()).getUTCFullYear();
const REPORTING_MONTH = parseIsoDate(ownerPortalToday()).getUTCMonth() + 1;

/** The two years the mock fixtures actually cover - `null` outside that range (see ComparableMetric.previousYearAvailable). */
function mockSeriesForYear(year: number): MonthlyMockPoint[] | null {
  if (year === REPORTING_YEAR) return MONTHLY_SERIES_2026;
  if (year === REPORTING_YEAR - 1) return MONTHLY_SERIES_2025;
  return null;
}

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
  locale: Locale,
  selectedMonth?: StatisticsMonthOption
): Promise<PropertyStatistics> {
  const year = period === "month" && selectedMonth ? selectedMonth.year : REPORTING_YEAR;
  const month = period === "month" && selectedMonth ? selectedMonth.month : REPORTING_MONTH;
  const months = monthsForPeriod(period, month);

  const currentSeries = mockSeriesForYear(year);
  const previousSeries = mockSeriesForYear(year - 1);
  const currentAgg = currentSeries ? aggregateMonths(currentSeries, year, months) : EMPTY_AGGREGATE;
  const previousAgg = previousSeries ? aggregateMonths(previousSeries, year - 1, months) : EMPTY_AGGREGATE;
  const previousYearAvailable = previousSeries !== null;

  // The current month is also driven by real (mock) reservations elsewhere in
  // the app (Übersicht page) - splice that live figure in so both pages agree
  // on September 2026 exactly, instead of two independently-authored numbers.
  // Only applies to the actual "today" mock month - any other month picked
  // from the dropdown just uses the aggregate series as-is.
  if (period === "month" && year === REPORTING_YEAR && month === REPORTING_MONTH) {
    const liveKpis = await getPropertyOverviewKpis(propertyId, "month");
    currentAgg.revenue = liveKpis.revenue;
    currentAgg.bookings = liveKpis.bookingsCount;
    currentAgg.stayNightsTotal = liveKpis.bookingsCount * liveKpis.avgStayNights;
    currentAgg.occupiedNights = (liveKpis.occupancyPct / 100) * currentAgg.availableNights;
  }

  const current = metricsFromAggregate(currentAgg);
  const previous = metricsFromAggregate(previousAgg);
  const [currentOwnerUseNights, previousOwnerUseNights] = await Promise.all([
    ownerUseNightsForRange(propertyId, year, months),
    previousYearAvailable ? ownerUseNightsForRange(propertyId, year - 1, months) : Promise.resolve(0),
  ]);

  // Unit-level performance is always reported for a single month, even when
  // the page itself is on YTD/Jahr - the current mock month when nothing
  // more specific was selected.
  const unitStatsMonth = period === "month" ? month : REPORTING_MONTH;
  const unitStatsYear = period === "month" ? year : REPORTING_YEAR;
  const unitStats = await getMockUnitPerformance(propertyId, unitStatsYear, unitStatsMonth);
  const bookingSources = computeBookingSourceBreakdown(currentAgg.revenue, currentAgg.bookings);

  return {
    propertyId,
    periodLabel: periodLabelFor(period, year, month, locale),
    comparisonLabel: getDictionary(locale).statistics.previousYearLabel,
    occupancyPct: metric(current.occupancy, previous.occupancy, previousYearAvailable),
    revenue: metric(currentAgg.revenue, previousAgg.revenue, previousYearAvailable),
    adr: metric(current.adr, previous.adr, previousYearAvailable),
    revPar: metric(current.revPar, previous.revPar, previousYearAvailable),
    bookingsCount: metric(currentAgg.bookings, previousAgg.bookings, previousYearAvailable),
    avgStayNights: metric(current.avgStay, previous.avgStay, previousYearAvailable),
    avgBookingValue: metric(current.avgBookingValue, previous.avgBookingValue, previousYearAvailable),
    ownerUseNights: metric(currentOwnerUseNights, previousOwnerUseNights, previousYearAvailable),
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
    unitStatsPeriodLabel: `${monthLabel(unitStatsMonth, locale)} ${unitStatsYear}`,
    bookingSources,
    avgLeadTimeDays: MOCK_AVG_LEAD_TIME_DAYS[period],
  };
}

/**
 * Per-unit performance for one specific month - always a single month
 * regardless of the page-level period filter (a "full year" per-unit
 * breakdown would be a wall of mostly-repeated numbers), and derived from
 * the real day-level reservation mock data, which only covers a window
 * around the current mock "today" - a month picked from outside that
 * window legitimately comes back all-zero, the same way a real property's
 * distant apaleo history would.
 */
async function getMockUnitPerformance(propertyId: string, year: number, month: number): Promise<UnitStatistics[]> {
  const units = await getUnitsForProperty(propertyId);
  const days = daysInMonth(year, month);
  const monthStart = isoDate(year, month, 1);
  const range: DateRange = { start: monthStart, endExclusive: addDays(monthStart, days) };
  const reservations = await getReservationsForProperty(propertyId, range);

  return units.map((unit) => {
    const unitReservations = reservations.filter((reservation) => reservation.unitId === unit.id);
    const confirmed = unitReservations.filter((reservation) => reservation.status === "confirmed");
    const revenue = calculatePeriodRevenue(confirmed, range);
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

/**
 * Real owner-use nights (status "owner-use") for the given months of one
 * year - same day-level mock reservation data and same "outside the mock
 * window comes back honestly empty" caveat as getMockUnitPerformance above.
 */
async function ownerUseNightsForRange(propertyId: string, year: number, months: number[]): Promise<number> {
  const firstMonth = months[0];
  const lastMonth = months[months.length - 1];
  const range: DateRange = {
    start: isoDate(year, firstMonth, 1),
    endExclusive: addDays(isoDate(year, lastMonth, 1), daysInMonth(year, lastMonth)),
  };
  const reservations = await getReservationsForProperty(propertyId, range);
  return nightsOfStatusInRange(reservations, range, ["owner-use"]);
}
