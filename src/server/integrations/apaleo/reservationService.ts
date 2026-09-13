import "server-only";
import { apaleoRequest } from "./client";
import type {
  ApaleoReservationSummary,
  RawApaleoReservation,
  RawApaleoReservationListResponse,
} from "./types";

/**
 * Live apaleo reservations for one property/date-range, normalized into a
 * PII-free shape immediately - `primaryGuest`, `booker` and `paymentAccount`
 * (all guest-identifying) are never read from the raw response, let alone
 * forwarded. Cancelled and no-show reservations are dropped here (never
 * rendered as occupancy, never counted), not left for callers to filter.
 *
 * `dateFilter=Stay` selects every reservation whose stay overlaps
 * [from, to) - the same semantics `reservationsInRange` already uses for the
 * mock data, so no calling code has to change.
 */

const PAGE_SIZE = 200;

interface FetchRange {
  /** ISO date (yyyy-MM-dd), inclusive. */
  from: string;
  /** ISO date (yyyy-MM-dd), exclusive. */
  to: string;
}

export function toReservationSummary(raw: RawApaleoReservation): ApaleoReservationSummary | null {
  // A reservation with no resolvable unit can't be placed on the calendar
  // grid or attributed to a unit's occupancy - drop it rather than guess.
  const unitId = raw.unit?.id;
  if (!unitId) return null;

  const accommodationGrossAmount =
    raw.timeSlices && raw.timeSlices.length > 0
      ? raw.timeSlices.reduce((sum, slice) => sum + (slice.baseAmount?.grossAmount ?? 0), 0)
      : null;

  const currency = raw.timeSlices?.find((slice) => slice.baseAmount)?.baseAmount?.currency ?? "EUR";

  return {
    id: raw.id,
    status: raw.status,
    unitId,
    // apaleo returns arrival/departure as full timestamps already carrying
    // the property's local UTC offset (e.g. "2026-09-14T16:00:00+02:00") -
    // the first 10 characters are already the correct local calendar date.
    arrivalDate: raw.arrival.slice(0, 10),
    departureDate: raw.departure.slice(0, 10),
    adults: raw.adults ?? null,
    children: raw.children ?? null,
    channelCode: raw.channelCode ?? null,
    source: raw.source ?? null,
    accommodationGrossAmount,
    currency,
  };
}

export async function listApaleoReservationsForProperty(
  apaleoPropertyId: string,
  range: FetchRange
): Promise<ApaleoReservationSummary[]> {
  const results: ApaleoReservationSummary[] = [];
  let pageNumber = 1;
  let fetched = 0;
  let total = Infinity;

  while (fetched < total) {
    const params = new URLSearchParams({
      propertyIds: apaleoPropertyId,
      dateFilter: "Stay",
      from: `${range.from}T00:00:00Z`,
      to: `${range.to}T00:00:00Z`,
      pageSize: String(PAGE_SIZE),
      pageNumber: String(pageNumber),
    });
    params.append("expand", "timeSlices");

    const data = await apaleoRequest<RawApaleoReservationListResponse>(
      `/booking/v1/reservations?${params.toString()}`
    );
    // An empty body (apaleo sends one for "nothing to return" on some
    // endpoints - see apaleoRequest) means no reservations in range; treat
    // exactly like a page with zero results rather than guessing further.
    if (!data) break;

    total = data.count;
    fetched += data.reservations.length;

    for (const raw of data.reservations) {
      if (raw.status === "Canceled" || raw.status === "NoShow") continue;
      const summary = toReservationSummary(raw);
      if (summary) results.push(summary);
    }

    if (data.reservations.length === 0) break;
    pageNumber += 1;
  }

  return results;
}
