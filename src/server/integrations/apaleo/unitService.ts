import "server-only";
import { apaleoRequest } from "./client";
import type { ApaleoUnitSummary, RawApaleoUnit, RawApaleoUnitListResponse } from "./types";

/**
 * Admin/test-only reads of apaleo units for one property. apaleo stays the
 * source of truth for units - nothing here is persisted into the app's own
 * database.
 */

function toUnitSummary(raw: RawApaleoUnit): ApaleoUnitSummary {
  return {
    id: raw.id,
    name: raw.name,
    unitGroupId: raw.unitGroup?.id,
    isActive: !raw.isArchived,
    maxPersons: raw.maxPersons,
  };
}

export async function getUnitsForProperty(apaleoPropertyId: string): Promise<ApaleoUnitSummary[]> {
  const data = await apaleoRequest<RawApaleoUnitListResponse>(
    `/inventory/v1/units?propertyId=${encodeURIComponent(apaleoPropertyId)}&pageSize=200&status=All`,
  );
  if (!data) return [];
  return data.units.map(toUnitSummary);
}
