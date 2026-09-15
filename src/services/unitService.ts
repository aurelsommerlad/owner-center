import type { Unit } from "@/types";
import { mockUnits } from "@/data/mock";
import { isApaleoConfigured, isMockFallbackAllowed, logApaleoNotConfiguredInProduction } from "@/server/integrations/apaleo/config";
import { resolveOwnerPortalProperty } from "@/server/services/ownerPortal/context";
import { getOwnerPortalUnits } from "@/server/services/ownerPortal/units";
import { markOwnerPortalDataError } from "@/server/services/ownerPortal/errorState";

/**
 * The one seam every calendar/overview/statistics calculation reads units
 * through - see reservationService.ts for the identical apaleo-configured /
 * property-mapped / request-failed decision this mirrors.
 */
export async function getUnitsForProperty(propertyId: string): Promise<Unit[]> {
  if (isMockFallbackAllowed()) {
    return mockUnits.filter((unit) => unit.propertyId === propertyId).sort((a, b) => a.sortOrder - b.sortOrder);
  }

  if (!isApaleoConfigured()) {
    logApaleoNotConfiguredInProduction("getUnitsForProperty");
    markOwnerPortalDataError();
    return [];
  }

  const context = await resolveOwnerPortalProperty(propertyId);
  if (!context?.apaleoPropertyId) {
    markOwnerPortalDataError();
    return [];
  }

  return getOwnerPortalUnits(propertyId);
}

export async function getUnit(unitId: string): Promise<Unit | undefined> {
  if (isMockFallbackAllowed()) {
    return mockUnits.find((unit) => unit.id === unitId);
  }
  // Units are always fetched per-property (getUnitsForProperty) on the live
  // path - no page looks up a bare unitId without already having its
  // property's unit list in hand, so this lookup only ever needs the mock
  // fallback above.
  return undefined;
}
