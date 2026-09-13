import type { Reservation, ReservationStatus, Unit } from "@/types";
import { nightsBetween, rangesOverlap } from "./dates";

export interface DateRange {
  /** ISO date, inclusive. */
  start: string;
  /** ISO date, exclusive. */
  endExclusive: string;
}

const UNAVAILABLE_STATUSES: ReservationStatus[] = ["confirmed", "blocked", "owner-use"];

/**
 * Reservations whose stay OVERLAPS `range` (not "arrives within range" and
 * not "was booked within range"). This is the app-wide definition of
 * "Buchungen im Zeitraum" for performance/stay KPIs (Belegung, Ø
 * Aufenthaltsdauer, Buchungsumsatz) - a stay that starts in August and ends
 * in September counts toward September's occupancy for the nights it
 * actually covers there. `arrivalsInRange`/`departuresInRange` below are
 * the separate, narrower definitions used only for "An-/Abreisen" widgets.
 */
export function reservationsInRange(
  reservations: Reservation[],
  propertyId: string,
  range: DateRange
): Reservation[] {
  return reservations.filter(
    (reservation) =>
      reservation.propertyId === propertyId &&
      rangesOverlap(range.start, range.endExclusive, reservation.checkIn, reservation.checkOut)
  );
}

export function reservationsForUnit(
  reservations: Reservation[],
  unitId: string,
  range: DateRange
): Reservation[] {
  return reservations.filter(
    (reservation) =>
      reservation.unitId === unitId &&
      rangesOverlap(range.start, range.endExclusive, reservation.checkIn, reservation.checkOut)
  );
}

function totalRangeNights(range: DateRange): number {
  return nightsBetween(range.start, range.endExclusive);
}

/** Nights within `range` whose reservation status is in `statuses`, clipped to the range bounds. */
export function nightsOfStatusInRange(
  reservations: Reservation[],
  range: DateRange,
  statuses: ReservationStatus[]
): number {
  let nights = 0;
  for (const reservation of reservations) {
    if (!statuses.includes(reservation.status)) continue;
    const overlapStart = reservation.checkIn > range.start ? reservation.checkIn : range.start;
    const overlapEnd =
      reservation.checkOut < range.endExclusive ? reservation.checkOut : range.endExclusive;
    const nights_ = nightsBetween(overlapStart, overlapEnd);
    if (nights_ > 0) nights += nights_;
  }
  return nights;
}

/** Paid-occupancy rate: confirmed guest-nights over total available unit-nights. */
export function occupancyPct(
  reservations: Reservation[],
  units: Unit[],
  range: DateRange,
  statuses: ReservationStatus[] = ["confirmed"]
): number {
  const totalUnitNights = units.length * totalRangeNights(range);
  if (totalUnitNights <= 0) return 0;
  const occupiedNights = nightsOfStatusInRange(reservations, range, statuses);
  return Math.round((occupiedNights / totalUnitNights) * 1000) / 10;
}

export function freeNightsInRange(
  reservations: Reservation[],
  units: Unit[],
  range: DateRange
): number {
  const totalUnitNights = units.length * totalRangeNights(range);
  const unavailableNights = nightsOfStatusInRange(reservations, range, UNAVAILABLE_STATUSES);
  return Math.max(totalUnitNights - unavailableNights, 0);
}

export function unitsWithStatusOnDate(
  reservations: Reservation[],
  units: Unit[],
  date: string,
  statuses: ReservationStatus[] = UNAVAILABLE_STATUSES
): Unit[] {
  return units.filter((unit) =>
    reservations.some(
      (reservation) =>
        reservation.unitId === unit.id &&
        statuses.includes(reservation.status) &&
        date >= reservation.checkIn &&
        date < reservation.checkOut
    )
  );
}

export function statusOnDate(
  reservations: Reservation[],
  unitId: string,
  date: string
): ReservationStatus | "free" {
  const match = reservations.find(
    (reservation) =>
      reservation.unitId === unitId && date >= reservation.checkIn && date < reservation.checkOut
  );
  return match?.status ?? "free";
}

export function arrivalsInRange(
  reservations: Reservation[],
  propertyId: string,
  range: DateRange
): Reservation[] {
  return reservations.filter(
    (reservation) =>
      reservation.propertyId === propertyId &&
      reservation.checkIn >= range.start &&
      reservation.checkIn < range.endExclusive
  );
}

export function departuresInRange(
  reservations: Reservation[],
  propertyId: string,
  range: DateRange
): Reservation[] {
  return reservations.filter(
    (reservation) =>
      reservation.propertyId === propertyId &&
      reservation.checkOut > range.start &&
      reservation.checkOut <= range.endExclusive
  );
}

export function averageStayNights(reservations: Reservation[]): number {
  const guestStays = reservations.filter((reservation) => reservation.status === "confirmed");
  if (guestStays.length === 0) return 0;
  const totalNights = guestStays.reduce(
    (sum, reservation) => sum + nightsBetween(reservation.checkIn, reservation.checkOut),
    0
  );
  return Math.round((totalNights / guestStays.length) * 10) / 10;
}

/**
 * Central, named KPI formulas - Dashboard (Übersicht) and Statistik call
 * these directly instead of recomputing inline, so the two pages can never
 * silently drift apart. Every one of them is a thin, pure wrapper over the
 * range/status-filtering helpers above; the wrappers exist so the formula
 * itself (not just its inputs) has one definition.
 */

/** Belegung = belegte Unit-Nächte / verfügbare Unit-Nächte, as a percentage. */
export function calculateOccupancy(occupiedUnitNights: number, availableUnitNights: number): number {
  if (availableUnitNights <= 0) return 0;
  return Math.round((occupiedUnitNights / availableUnitNights) * 1000) / 10;
}

/** Buchungsumsatz = sum of accommodation-only revenue across confirmed reservations - never city tax/extras (see Reservation.accommodationAmount). */
export function calculateBookingRevenue(reservations: Pick<Reservation, "status" | "accommodationAmount">[]): number {
  return reservations
    .filter((reservation) => reservation.status === "confirmed")
    .reduce((sum, reservation) => sum + reservation.accommodationAmount, 0);
}

/** Buchungen = count of confirmed reservations whose stay overlaps the period (see reservationsInRange above for the overlap definition). */
export function calculateBookingCount(reservations: Pick<Reservation, "status">[]): number {
  return reservations.filter((reservation) => reservation.status === "confirmed").length;
}

/** Ø Aufenthaltsdauer - alias kept alongside averageStayNights so every KPI has a calculate*-named entry point. */
export function calculateAverageStay(reservations: Reservation[]): number {
  return averageStayNights(reservations);
}

/** ADR = Accommodation Revenue / belegte Unit-Nächte. */
export function calculateADR(accommodationRevenue: number, occupiedUnitNights: number): number {
  return occupiedUnitNights > 0 ? accommodationRevenue / occupiedUnitNights : 0;
}

/** RevPAR = Accommodation Revenue / verfügbare Unit-Nächte - mathematically ADR × Belegung, always consistent since both are derived from the same occupied/available unit-night counts. */
export function calculateRevPAR(accommodationRevenue: number, availableUnitNights: number): number {
  return availableUnitNights > 0 ? accommodationRevenue / availableUnitNights : 0;
}
