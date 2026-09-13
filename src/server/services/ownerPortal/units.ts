import "server-only";
import type { Unit } from "@/types";
import { getUnitsForProperty as listApaleoUnits } from "@/server/integrations/apaleo/unitService";
import { ApaleoError } from "@/server/integrations/apaleo/errors";
import { resolveOwnerPortalProperty } from "./context";
import { markOwnerPortalDataError } from "./errorState";

/**
 * Live apaleo units for one internal property, translated into the owner-
 * facing `Unit` type. Archived units are excluded (never shown, never
 * counted as available inventory - requirement: exclude archived units from
 * Belegung).
 *
 * apaleo's unit resource does not carry a `minOccupancy`, room size, or
 * explicit sort order the way the mock data did - those are cosmetic
 * details only ever used for capacity display in the calendar's unit
 * column, never for a KPI calculation, so a floor of 1 guest and an
 * alphabetical sort order are used rather than left blank. `sizeSqm` is not
 * exposed by this endpoint and is set to 0 (no page currently renders it).
 */
export async function getOwnerPortalUnits(propertyId: string): Promise<Unit[]> {
  const context = await resolveOwnerPortalProperty(propertyId);
  if (!context || !context.apaleoPropertyId) return [];

  try {
    const raw = await listApaleoUnits(context.apaleoPropertyId);
    return raw
      .filter((unit) => unit.isActive)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((unit, index): Unit => ({
        id: unit.id,
        propertyId,
        name: unit.name,
        minOccupancy: 1,
        maxOccupancy: unit.maxPersons ?? 1,
        sizeSqm: 0,
        imageSeed: unit.id,
        sortOrder: index + 1,
      }));
  } catch (err) {
    if (err instanceof ApaleoError) {
      markOwnerPortalDataError();
      return [];
    }
    throw err;
  }
}
