import type { Reservation } from "@/types";
import { mockReservations } from "@/data/mock";
import type { DateRange } from "@/lib/occupancy";
import { reservationsInRange } from "@/lib/occupancy";
import { addDays, today } from "@/lib/dates";
import { isApaleoConfigured } from "@/server/integrations/apaleo/config";
import { resolveOwnerPortalProperty } from "@/server/services/ownerPortal/context";
import { getOwnerPortalReservations } from "@/server/services/ownerPortal/reservations";
import { markOwnerPortalDataError } from "@/server/services/ownerPortal/errorState";

/**
 * The one seam every calendar/overview/statistics calculation reads
 * reservations through - components never call apaleo directly.
 *
 * - apaleo not configured at all (no credentials - this sandbox's own
 *   state, and any local dev checkout without them): falls back to the V1
 *   mock fixtures, exactly as before. This is a deliberate local-dev
 *   convenience, not "showing mock data as live" - the same distinction
 *   /admin/properties already draws for its own apaleo section.
 * - apaleo configured but this property has no apaleoPropertyId mapped yet
 *   in /admin, or the live apaleo request itself fails: returns an empty
 *   array and flags the request (see ownerPortal/errorState.ts) so the
 *   page renders "Daten konnten aktuell nicht geladen werden." - never
 *   invented numbers for a real, connected owner.
 */
export async function getReservationsForProperty(
  propertyId: string,
  range?: DateRange
): Promise<Reservation[]> {
  if (!isApaleoConfigured()) {
    if (!range) {
      return mockReservations.filter((reservation) => reservation.propertyId === propertyId);
    }
    return reservationsInRange(mockReservations, propertyId, range);
  }

  const context = await resolveOwnerPortalProperty(propertyId);
  if (!context?.apaleoPropertyId) {
    markOwnerPortalDataError();
    return [];
  }

  // No caller currently omits `range` on the live path; this bound exists
  // only as a defensive fallback so a live fetch is never truly unbounded.
  const effectiveRange: DateRange = range ?? { start: addDays(today(), -400), endExclusive: addDays(today(), 400) };
  return getOwnerPortalReservations(propertyId, effectiveRange);
}
