import "server-only";
import type { Reservation, ReservationStatus } from "@/types";
import type { DateRange } from "@/lib/occupancy";
import { listApaleoReservationsForProperty } from "@/server/integrations/apaleo/reservationService";
import { listApaleoMaintenancesForProperty } from "@/server/integrations/apaleo/maintenanceService";
import type { ApaleoReservationSummary } from "@/server/integrations/apaleo/types";
import { resolveOwnerPortalProperty } from "./context";
import { markOwnerPortalDataError } from "./errorState";
import { classifyBookingChannel } from "./channels";

/**
 * apaleo's reservation statuses that represent an actual occupied stay.
 * `Canceled`/`NoShow` never reach here - they're dropped in
 * integrations/apaleo/reservationService.ts before this file ever sees
 * them, so they can never render as occupancy or be counted as a booking.
 */
const OCCUPYING_STATUSES: ReadonlySet<ApaleoReservationSummary["status"]> = new Set([
  "Confirmed",
  "InHouse",
  "CheckedOut",
]);

function occupancyLabel(adults: number | null, children: number | null): string | undefined {
  if (adults === null) return undefined;
  const adultsLabel = `${adults} ${adults === 1 ? "Erwachsener" : "Erwachsene"}`;
  if (!children) return adultsLabel;
  return `${adultsLabel} · ${children} ${children === 1 ? "Kind" : "Kinder"}`;
}

function toReservation(propertyId: string, raw: ApaleoReservationSummary): Reservation {
  return {
    id: raw.id,
    internalRef: raw.id,
    unitId: raw.unitId,
    propertyId,
    checkIn: raw.arrivalDate,
    checkOut: raw.departureDate,
    status: "confirmed",
    // Accommodation-only revenue (see integrations/apaleo/reservationService.ts) -
    // never city tax, never extras. `null` (apaleo returned no timeSlices to
    // sum) is treated as 0 rather than guessed from another field.
    accommodationAmount: raw.accommodationGrossAmount ?? 0,
    currency: raw.currency,
    occupancy: occupancyLabel(raw.adults, raw.children),
    channel: classifyBookingChannel(raw.channelCode, raw.source),
  };
}

function maintenanceToReservation(propertyId: string, id: string, unitId: string, from: string, to: string): Reservation {
  return {
    id,
    internalRef: id,
    unitId,
    propertyId,
    checkIn: from,
    checkOut: to,
    status: "blocked",
    accommodationAmount: 0,
    currency: "EUR",
  };
}

/**
 * Live apaleo reservations + maintenance windows for one internal property
 * and date range, translated into the owner-facing `Reservation[]` shape -
 * the one type every calendar/overview/statistics calculation already
 * consumes, so nothing downstream of this function has to change.
 *
 * Cancelled/no-show reservations never appear (filtered in the apaleo
 * integration layer). Maintenance windows (OutOfService/OutOfOrder/
 * OutOfInventory) render as "blocked". There is currently no live source
 * for "Eigennutzung" (owner use) - apaleo exposes no field that
 * unambiguously distinguishes it from any other block or booking - so the
 * `owner-use` status is simply never produced by this function; see
 * integrations/apaleo/maintenanceService.ts for the grounding.
 */
export async function getOwnerPortalReservations(
  propertyId: string,
  range: DateRange
): Promise<Reservation[]> {
  const context = await resolveOwnerPortalProperty(propertyId);
  if (!context || !context.apaleoPropertyId) return [];

  // Reservations and maintenance windows are fetched independently, and a
  // maintenance failure is never allowed to take reservations down with it:
  // reservations are core data (the calendar, occupancy, every KPI), while
  // maintenance windows only refine the occupancy picture (Out-of-Service/
  // -Order/-Inventory blocking) - losing them means slightly less accurate
  // "blocked" bars, not "no data at all". Promise.allSettled runs both
  // concurrently while keeping their failures separate.
  const [reservationsResult, maintenancesResult] = await Promise.allSettled([
    listApaleoReservationsForProperty(context.apaleoPropertyId, {
      from: range.start,
      to: range.endExclusive,
    }),
    listApaleoMaintenancesForProperty(context.apaleoPropertyId, {
      from: range.start,
      to: range.endExclusive,
    }),
  ]);

  if (reservationsResult.status === "rejected") {
    // A recognized ApaleoError, a shape/parsing mismatch in a real apaleo
    // response, or anything else - degrades to "data unavailable" rather
    // than crashing the page. Logged server-side (shows up in Vercel's
    // function logs) so a real cause is still diagnosable.
    console.error(`[ownerPortal] failed to load reservations for property ${propertyId}:`, reservationsResult.reason);
    markOwnerPortalDataError();
    return [];
  }

  const reservations = reservationsResult.value
    .filter((raw) => OCCUPYING_STATUSES.has(raw.status))
    .map((raw) => toReservation(propertyId, raw));

  if (maintenancesResult.status === "rejected") {
    // Supplementary data only - warn, do not flag the page-wide "data
    // unavailable" notice, and still return the reservations we do have.
    console.warn(`[ownerPortal] maintenance data unavailable for property ${propertyId}:`, maintenancesResult.reason);
    return reservations;
  }

  const maintenanceBlocks = maintenancesResult.value.map((raw) =>
    maintenanceToReservation(propertyId, `maintenance-${raw.id}`, raw.unitId, raw.fromDate, raw.toDate)
  );

  return [...reservations, ...maintenanceBlocks];
}
