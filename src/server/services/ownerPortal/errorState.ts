import "server-only";
import { cache } from "react";

/**
 * Request-scoped "did a live apaleo read fail" flag. `cache()` returns the
 * same object for every call within one request/render and a fresh one for
 * the next request, so mutating `.value` here is a safe way to signal an
 * error up from deep inside services/reservationService.ts /
 * services/unitService.ts (whose Promise<Reservation[]>/Promise<Unit[]>
 * signatures must stay unchanged) to the page component that finally
 * decides whether to render "Daten konnten aktuell nicht geladen werden."
 * Never shared across requests/owners - it is not a module-level `let`.
 */
const getFlag = cache((): { value: boolean } => ({ value: false }));

export function markOwnerPortalDataError(): void {
  getFlag().value = true;
}

export function hadOwnerPortalDataError(): boolean {
  return getFlag().value;
}
